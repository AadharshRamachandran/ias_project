import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import Navbar from "./Navbar";
import "./AccessList.css";

const AccessListPage = ({ contract }) => {
  const [accessList, setAccessList] = useState([]);

  useEffect(() => {
    const fetchAccessList = async () => {
      const list = await contract.shareAccess();
      setAccessList(list);
    };
    contract && fetchAccessList();
  }, [contract]);

  const handleAllow = async (address) => {
    await contract.allow(address);
    const addressObj = { user: address, access: true };
    if (accessList.some(item => item.user === address)) {
      setAccessList(
        accessList.map((item) => {
          if (item.user === address) {
            return { ...item, access: true };
          }
          return item;
        })
      );
    } else {
      setAccessList([...accessList, addressObj]);
    }
  };

  const handleDisallow = async (address) => {
    await contract.disallow(address);
    setAccessList(
      accessList.map((item) => {
        if (item.user === address) {
          return { ...item, access: false };
        }
        return item;
      })
    );
    // setAccessList(updatedList);
  };


  return (
    <div>
      {/* Navbar section */}
      <div className="navbar-section">
        <Navbar />
      </div>
      <div className="accesslist-section">
        <h1 className="accesslist-h1">Access List</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const address = e.target.address.value;
            handleAllow(address);
            e.target.reset();
          }}
          className="accesslist-form"
        >
          <input
            className="accesslist-input"
            type="text"
            name="address"
            placeholder="Enter Address"
          />
          <button type="submit" className="accesslist-button">
            Allow
          </button>
        </form>

        {accessList.length > 0 ? (
          <ul>
            {accessList.map((item) => (
              <li key={item.user} className="accesslist-container">
                <div className="address">{item.user}</div>
                <div className="status">
                  {item.access ? "Allowed" : "Disallowed"}
                </div>
                {item.access ? (
                  <button
                    className="accesslist-button"
                    onClick={() => handleDisallow(item.user)}
                  >
                    Disallow
                  </button>
                ) : (
                  <button
                    className="accesslist-button"
                    onClick={() => handleAllow(item.user)}
                  >
                    Allow
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <div className="panel" style={{maxWidth:720, margin:'24px auto', textAlign:'center'}}>
            <h3 style={{marginBottom:8}}>No addresses are allowed yet</h3>
            <p style={{color:'var(--muted)', marginBottom:14}}>
              Add an address above to grant access. Allowed addresses will
              appear below where you can revoke permissions.
            </p>

            <div className="empty-steps">
              <div className="empty-step">
                <div className="step-num">1</div>
                <div className="step-body">
                  <div className="step-title">Paste an address</div>
                  <div className="step-desc">Enter the wallet address you want to allow</div>
                </div>
              </div>
              <div className="empty-step">
                <div className="step-num">2</div>
                <div className="step-body">
                  <div className="step-title">Click Allow</div>
                  <div className="step-desc">Use the Allow button to grant access</div>
                </div>
              </div>
              <div className="empty-step">
                <div className="step-num">3</div>
                <div className="step-body">
                  <div className="step-title">Manage access</div>
                  <div className="step-desc">Revoke access anytime from this list</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

AccessListPage.propTypes = {
  contract: PropTypes.shape({
    shareAccess: PropTypes.any,
    allow: PropTypes.any,
    disallow: PropTypes.any,
  }),
};

export default AccessListPage;

