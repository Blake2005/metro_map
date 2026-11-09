import './Sidebar.css';
import { useCallback } from 'react';
import { ICON_COLORS } from './Constants';
import { isTimeFrozen } from 'maplibre-gl';

// Route list component that displays the currently tracked routes and allows requesting removal of one.
// Input:  routes - object mapping route id -> route name of the tracked routes.
//        onRouteDeletion - callback invoked with the selected route id when the delete button is clicked.
// Output: JSX - list of tracked routes with a delete button each.
type RouteListParams = {
    routes: Object,
    onRouteDeletion: Function,
}
export default function RouteList({ routes, onRouteDeletion }: RouteListParams){

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