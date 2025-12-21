import React, { useState } from "react";
import PropTypes from "prop-types";
import "./Secondfile.css";

const Display = ({ contract, account }) => {
  const [data, setData] = useState("");
  const [showData, setShowData] = useState(false);

  const getdata = async () => {
    let dataArray;
    const addressInput = document.querySelector(".address");
    const Otheraddress = addressInput ? addressInput.value : "";

    try {
      if (Otheraddress) {
        dataArray = await contract.display(Otheraddress);
        console.log("RAW RETURN VALUE:", dataArray);
      } else {
        dataArray = await contract.display(account);
        console.log("RAW RETURN VALUE:", dataArray);
      }
    } catch (e) {
      alert("You don't have access");
      return;
    }

    if (!dataArray || dataArray.length === 0) {
      alert("No image to display");
      return;
    }

    const images = dataArray.map((item, i) => {
      const cid = item.replace("ipfs://", "");
      const url = `https://gateway.pinata.cloud/ipfs/${cid}`;

      return (
        <div key={i} className="image-container">
          <button className="delete-button" onClick={() => deleteFile(i)}>
            <i className="fa-solid fa-trash fa-beat" style={{ color: "#007bff" }}></i>
          </button>

          <a href={url} target="_blank" rel="noreferrer" className="file-link">
            <img
              src={url}
              alt="File"
              className="image-list"
              width={300}
              height={300}
              onError={(e) => {
                // hide image and reveal video or placeholder
                e.target.style.display = "none";
                const next = e.target.nextSibling;
                if (next && next.tagName === "VIDEO") {
                  next.style.display = "block";
                } else {
                  // show placeholder element (two siblings ahead)
                  const placeholder = e.target.parentNode.querySelector('.image-placeholder');
                  if (placeholder) placeholder.style.display = 'flex';
                }
              }}
            />

            <video
              src={url}
              className="image-list"
              width={300}
              height={300}
              style={{ display: "none" }}
              controls
              onError={(e) => {
                // if video can't play, show placeholder
                e.target.style.display = 'none';
                const placeholder = e.target.parentNode.querySelector('.image-placeholder');
                if (placeholder) placeholder.style.display = 'flex';
              }}
            />

            <div className="image-placeholder" style={{display:'none'}}>
              <div className="placeholder-inner">
                <i className="fa-solid fa-file-lines" style={{fontSize:28, marginBottom:8}}></i>
                <div className="placeholder-text">File</div>
              </div>
            </div>
          </a>

          <div className="file-actions">
            <a href={url} target="_blank" rel="noreferrer" className="open-link" aria-label="Open file">
              <i className="fa-solid fa-eye"></i>
            </a>
            <a href={url} className="download-link" download aria-label="Download file">
              <i className="fa-solid fa-download"></i>
            </a>
          </div>
        </div>
      );
    });

    setData(images);
    setShowData(true);
  };

  const deleteFile = async (index) => {
    try {
      await contract.deleteUrl(index);
      alert("Image deleted successfully");
      getdata();
    } catch (e) {
      alert("Error deleting image");
    }
  };

  return (
    <>
      <div className="search-bar">
        <input
          type="text"
          className="address"
          placeholder="Enter the Account address"
        />
        <button
          className="search-button"
          onClick={() => {
            getdata();
            setShowData(true);
          }}
        >
          <i className="fa-solid fa-magnifying-glass"></i>
        </button>
      </div>

      {showData && data.length > 0 && (
        <div className="blank-container">
          <div className="image-grid">
            {data}
            <button className="close-container" onClick={() => setShowData(false)}>
              <i className="fa-sharp fa-solid fa-circle-xmark fa-2xl"></i>
            </button>
          </div>
        </div>
      )}
    </>
  );
};

Display.propTypes = {
  contract: PropTypes.shape({
    display: PropTypes.func,
    deleteUrl: PropTypes.func,
  }),
  account: PropTypes.string,
};

export default Display;

