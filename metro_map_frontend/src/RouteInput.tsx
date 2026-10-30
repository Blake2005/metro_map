import React, { useState } from 'react';
import { isInteger } from './HelperFuncs';
import './Sidebar.css';

// Route input component that lets the user add a tracked transit route by entering its numeric id.
// Input:  onRouteInput - callback that triggers a refresh of the tracked routes list after a successful add.
// Output: JSX - form with a text input and an add button.

export default function RouteInput({ onRouteInput }: {onRouteInput: Function})  {
    const [routeid, setRouteid] = useState('');

    // Validates the entered route id, sends it to the backend add endpoint and refreshes the routes list.
    // Input:  None - reads the routeid state and uses the onRouteInput callback.
    // Output: Promise<void> - resolves once the request completes, errors are caught and logged.

    async function addRoute(){

        if(!isInteger(routeid)){
            console.log("Invalid Input");
            return;
        }

        const requestOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Signals the server what data format to expect
            },
            body: JSON.stringify({
                route: routeid,
            })
        };

        try {
            await fetch('/api/add_tracked_route', requestOptions);
            onRouteInput();
        } catch (err) {
            console.error("Failed to add route", err);
        }
    }

    return(
          <form onSubmit={addRoute}>
            <input
                id="route-input"
                type="text"
                value={routeid}
                onChange={(e) => setRouteid(e.target.value)} // Update state on every keystroke
                required
                className="sidebar-input"
                placeholder="Search routes..."
            />
            <button className='route-input-button'>
                Add Route
            </button>
          </form>
    )
}