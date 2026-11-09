import './Sidebar.css';
import { useCallback } from 'react';
import { ICON_COLORS } from './Constants';
import { isTimeFrozen } from 'maplibre-gl';

// Route list component that displays the currently tracked routes and allows removing one.
// Input:  routes - object mapping route id -> route name of the tracked routes.
// Output: JSX - list of tracked routes with a delete button each.
type RouteListParams = {
    routes: Object,
    onRouteDeletion: Function,
}
export default function RouteList({ routes, onRouteDeletion }: RouteListParams){

    // Deletes the given route through the backend remove endpoint and refreshes the list on success.
    // Input:  rid - route id (as a string) to remove from tracking.
    // Output: Promise<void> - resolves once the request completes, errors are caught and logged.

    return(
        <ul className="route-list">
            {Object.entries(routes).map(([id, name]) => (
                <li key={id}
                style={{
                    border: '2px solid',
                    borderColor: ICON_COLORS[id] || ICON_COLORS['DEFAULT'],
                    margin: '8px 0',
                    // padding: '10px',
                }}>
                {name.replaceAll("_", " ")} (Route Number: {id})
                <button onClick={() => onRouteDeletion(id)}>×</button>
                </li>
            ))}
        </ul>
    )
}