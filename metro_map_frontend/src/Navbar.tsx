import React from "react";
import './Navbar.css'

// Navbar component that renders the app title, the placeholder links and the button.
// Input:  None - renders static content.
// Output: JSX - the rendered navbar.

export default function NavBar(){
    return(
        <nav className="navbar">
            <div className="navbar-logo">Minneapolis-Saint Paul Metro Map</div>
            {/* <ul className="navbar-links">
                <li><a href="#home">Foo</a></li>
                <li><a href="#about">Foo</a></li>
                <li><a href="#services">Foo</a></li>
                <li><a href="#contact">Foo</a></li>
            </ul>
            <div className="navbar-button">
                <button>Foo</button>
            </div> */}
        </nav>
    );
}