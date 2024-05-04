import axios from "axios";

const API = axios.create({
    baseURL: "https://mern-project-fitzen.onrender.com/api/",
});

export const UserSignUp = async (data) => API.post("/user/signup", data);
export const UserSignIn = async (data) => API.post("/user/signin", data);

export const getDashboardDetails = async (token) => API.get("/user/dashboard", {
    headers: {Authorization: `Bearer ${token}`},
});

export const getWorkouts = async (token,date) => API.get(`/user/workout${date}`, {
    headers: {Authorization: `Bearer ${token}`},
});

export const addWorkout = async (token, data) => API.get("/user/workout", data, {
    headers: {Authorization: `Bearer ${token}`},
});