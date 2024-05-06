import React, { useState } from 'react'
import styled from 'styled-components';
import TextInput from './TextInput';
import Button from "../components/Button";

const Card = styled.div`
flex: 1;
min-width: 280px;
padding: 24px;
border: 1px solid ${({ theme }) => theme.text_primary + 20};
border-radius: 14px;
display: flex;
flex-direction: column;
gap: 6px;
margin-bottom: 22px;
box-shadow: 1px 6px 20px 0px ${({ theme }) => theme.primary + 15};
@media (max-width: 600px) {
    padding: 16px;
    margin-bottom: 10px;
}
`;
const Title = styled.div`
font-weight: 600;
font-size: 16px;
color: ${({ theme }) => theme.primary};
@media (ma-width: 600px) {
    font-size: 14px
}
`;

const AddWorkout = ({ workout, setWorkout, addNewWorkout, buttonLoading }) => {
    return (
        <Card>
            <Title>Add New Workout</Title>
            <TextInput 
            value={workout}
            textArea
            rows={10}
            placeholder={"Enter in this format:\n#Category\nWorkout Name\nSets\nReps\nWeight\nDuration"}
            handelChange={(e) => setWorkout(e.target.value)}/>
            <Button
            text="Add Workout"
            small
            onClick={() => addNewWorkout()}
            isLoading={buttonLoading}
            isDisabled={buttonLoading}
            />
        </Card>
    );
};

export default AddWorkout;