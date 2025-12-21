import React, { useState } from "react";
import "./Navbar.css";
import { Link } from "react-router-dom";
import Connectwallet from "./Connectwallet";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="logo" aria-label="BlockShare home">
          <span className="logo-text">BlockShare</span>
        </Link>
      </div>

      <ul
        className={menuOpen ? "nav-links-mobile active" : "nav-links"}
        onClick={() => setMenuOpen(false)}
      >
        <li>
          <Link to="/Secondpage" className="item">
            Upload
          </Link>
        </li>
        <li>
          <Link to="/working" className="item">
            Working
          </Link>
        </li>
        <li>
          <Link to="/accessList" className="item">
            Allowlist
          </Link>
        </li>
        <li>
          <div className="item">
            <Connectwallet />
          </div>
        </li>
      </ul>

      <button
        className="mobile-menu-icon"
        aria-label="Toggle menu"
        onClick={() => setMenuOpen((s) => !s)}
      >
        {menuOpen ? (
          <span className="hamburger">✕</span>
        ) : (
          <span className="hamburger">☰</span>
        )}
      </button>
    </nav>
  );
};

export default Navbar;

