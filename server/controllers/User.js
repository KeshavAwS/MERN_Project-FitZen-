import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { createError } from "../error.js";
import User from "../models/User.js";
import Workout from "../models/Workout.js";

dotenv.config();

const jwtSecret = `${process.env.JWT_KEY}`;
if (!jwtSecret) {
    console.error("JWT secret key is missing in environment variables.");
    process.exit(1);
}

export const UserRegister = async (req, res, next) => {
    try {
        const { email, password, name, img } = req.body;

        //Check if the email is in use
        const existingUser = await User.findOne({ email }).exec();
        if (existingUser) {
            return next(createError(409, "Email is already in use"));
        }

        const salt = bcrypt.genSaltSync(10);
        const hashedPassword = bcrypt.hashSync(password, salt);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            img,
        });

        const createdUser = await user.save();
        const token = jwt.sign({ id: createdUser._id }, jwtSecret, {
            expiresIn: "9999 years",
        });
        return res.status(200).json({ token, user });
    } catch (err) {
        next(err);
    }
};

export const UserLogin = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        //Check if user exists
        if (!user) {
            return next(createError(404, "User not found"));
        }
        console.log(user);
        //Check if password is correct
        const isPasswordCorrect = await bcrypt.compareSync(password, user.password);
        if (!isPasswordCorrect) {
            return next(createError(403, "Incorrect Password"));
        }

        const token = jwt.sign({ id: user._id }, jwtSecret, {
            expiresIn: "9999 years",
        });
        return res.status(200).json({ token, user });
    } catch (err) {
        next(err);
    }
};

export const getUserDashboard = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const user = await User.findById(userId);
        if (!user) {
            return next(createError(404, "User not found"));
        }

        const currentDateFormatted = new Date();
        const startToday = newDate(
            currentDateFormatted.getFullYear(),
            currentDateFormatted.getMonth(),
            currentDateFormatted.getDate()
        );
        const endToday = new Date(
            currentDateFormatted.getFullYear(),
            currentDateFormatted.getMonth(),
            currentDateFormatted.getDate() + 1
        );

        const totalCaloriesBurnt = await Workout.aggregate([
            { $match: { user: user._id, date: { $gte: startToday, $lt: endToday } } },
            {
                $group: {
                    _id: null,
                    totalCaloriesBurnt: { $sum: "caloriesBurned" },
                },
            },
        ]);

        const totalWorkouts = await Workout.countDocuments({
            user: userId,
            date: { $gte: startToday, $lte: endToday },
        });

        const avgCaloriesBurntPerWorkout = totalCaloriesBurnt.length > 0 ?
            totalCaloriesBurnt(0).totalCaloriesBurnt / totalWorkouts
            : 0;

        const categoryCalories = await Workout.aggregate([
            { $match: { user: user._id, date: { $gte: startToday, $lt: endToday } } },
            {
                $group: {
                    _id: "$category",
                    totalCaloriesBurnt: { $sum: "caloriesBurned" },
                },
            },
        ]);

        const pieChartData = categoryCalories.map((category, index) => ({
            id: index,
            value: category.totalCaloriesBurnt,
            label: category._id,
        }));

        const weeks = [];
        const caloriesBurnt = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(
                currentDateFormatted.getTime() - i * 24 * 60 * 60 * 1000
            );
            weeks.push(`${date.getDate()}th`);

            const startofDay = newDate(
                date.getFullYear(),
                date.getMonth(),
                date.getDate()
            );
            const endofDay = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate() + 1
            );

            const weekData = await Workout.aggregate([
                {
                    $match: {
                        user: user._id,
                        date: { $gte: startofDay, $lt: endofDay },
                    },
                },
                {
                    $group: {
                        _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
                        totalCaloriesBurnt: { $sum: "caloriesBurned" },
                    },
                },
                {
                    $sort: { _id: 1 },
                },
            ]);

            caloriesBurnt.push(
                weekData[0]?.totalCaloriesBurnt ? weekData[0]?.totalCaloriesBurnt : 0
            );
        }

        return res.status(200).json({
            totalCaloriesBurnt:
                totalCaloriesBurnt.length > 0
                    ? totalCaloriesBurnt[0].totalCaloriesBurnt
                    : 0,
            totalWorkouts: totalWorkouts,
            avgCaloriesBurntPerWorkout: avgCaloriesBurntPerWorkout,
            totalCaloriesBurnt: {
                weeks: weeks,
                caloriesBurned: caloriesBurnt,
            },
            pieChartData: pieChartData,
        });
    } catch (err) {
        next(err);
    }
};

export const getWorkoutsByDate = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const user = await User.findById(userId);
        let date = req.query.date ? new Date(req.query.date) : new Date();

        if (!user) {
            return next(createError(404, "User not found"));
        }
        const startofDay = newDate(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
        const endofDay = new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate() + 1
        );

        const todaysWorkouts = await Workout.find({
            userId: userId,
            date: { $gte: startofDay, $lt: endofDay },
        });

        const totalCaloriesBurnt = todaysWorkouts.reduce(
            (total, workout) => total + workout.caloriesBurned,
            0
        );

        return res.status(200).json({ todaysWorkouts, totalCaloriesBurnt });
    } catch (err) {
        next(err);
    }
};

export const addWorkout = async (req, res, next) => {
    try {
        const userId = req.user?.id;
        const { workoutString } = req.body;
        if (!workoutString) {
            return next(createError(400, "Workout string is missing"));
        }

        const eachWorkout = workoutString.split(";").map((line) => line.trim());

        const categories = eachWorkout.filter((line) => line.startsWith("#"));
        if (categories.length === 0) {
            return next(createError(400, "No categories found in workout string"));
        }

        const parsedWorkouts = [];
        let currentCategory = "";
        let count = 0;

        await eachWorkout.forEach((line) => {
            count++;
            if (line.startsWith("#")) {
                const parts = line?.split("\n").map((part) => part.trim());
                console.log(parts);
                if (parts.length < 5) {
                    return next(
                        createError(400, `Workout string is missing for ${count}th workout`),
                    );
                }

                currentCategory = parts[0].substring(1).trim();
                const workoutDetails = parseWorkoutLine(parts);
                if (workoutDetails == null) {
                    return next(createError(400, "Please enter in proper format"));
                }

                if (workoutDetails) {
                    workoutDetails.category = currentCategory;
                    parsedWorkouts.push(workoutDetails);
                }
            }
            else {
                return next(
                    createError(400, `Workout string is missing for ${count}th workout`),
                );
            }
        });

        await parsedWorkouts.forEach(async (workout) => {
            workout.caloriesBurned = parseFloat(calculateCaloriesBurnt(workout));
            await Workout.create({ ...workout, user: userId });
        });

        return res.status(201).json({
            message: "Workouts added successfully",
            workouts: parsedWorkouts,
        });

    } catch (err) {
        next(err);
    }
};

const parseWorkoutLine = (parts) => {
    const details = {};
    console.log(parts);
    if (parts.length >= 5) {
        details.workoutName = parts[1].substring(1).trim();
        details.sets = parseInt(parts[2].split("sets")[0].substring(1).trim());
        details.reps = parseInt(parts[2].split("sets")[1].split("reps")[0].substring(1).trim());
        details.weight = parseFloat(parts[3].split("kg")[0].substring(1).trim());
        details.duration = parseFloat(parts[4].split("min")[0].substring(1).trim());
        console.log(details);
        return details;
    }
    return null;
};

const calculateCaloriesBurnt = (workoutDetails) => {
    const durationInMinutes = parseInt(workoutDetails.duration);
    const weightInKg = parseInt(workoutDetails.weight);
    const caloriesBurntPerMinute = 5; // Sample value, actual calculation may vary
    return durationInMinutes * caloriesBurntPerMinute * weightInKg;
};
