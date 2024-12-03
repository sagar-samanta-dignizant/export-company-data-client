import { useState, useEffect } from "react";
import axios from "axios";
import io from "socket.io-client";
import PdfViewer from "./components/PdfViewer";
import "./App.css";

const App = () => {
  const [formData, setFormData] = useState({
    companyId: "",
    customPath: "",
    startRange: "",
    endRange: "",
    isChecked: false,
  });
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [downloadOnlyPdf, setDownloadOnlyPdf] = useState(false);
  const [filesData, setFilesData] = useState([]);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);

  const serverApi = import.meta.env.REACT_APP_SERVER_API || "http://localhost:3001";

  useEffect(() => {
    const socket = io(serverApi);

    socket.on("status", (data) => {
      console.log("vvvv", data);

      setStatusMessage(data.message);
      if (data.message === "CSV generation completed!" || data.message === "Data fetching completed!") {
        setIsProcessing(false);
        setProgress(100);
        setTimeout(() => {
          setFormData({
            companyId: "",
            customPath: "",
            startRange: "",
            endRange: "",
            isChecked: false,
          });
          setProgress(0);
          setStatusMessage("Download successful!");
        }, 2000);
      } else if (data.message.includes("error")) {
        setIsProcessing(false);
        setErrorMessage("An error occurred while processing the request.");
      }
    });

    socket.on("progress", (data) => {
      setProgress(data.percent);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setErrorMessage("");

    try {
      if (downloadOnlyPdf) {
        const response = await axios.post(
          `${serverApi}/fetch-all-data`,
          formData
        );
        const { geoProjects, geoFiles, geoEstimates, geoAnnotations } =
          response.data;
        const validFiles = geoFiles.filter((file) => file && file.base64File);
        const filesData = [];
        geoProjects.forEach((project) => {
          const estimates = geoEstimates.filter(
            (o) => o.geoProjectId === project.id
          );
          const files = validFiles.filter((o) => o.geoProjectId === project.id);
          estimates.forEach((estimate) => {
            files.forEach((file) => {
              const annotations = geoAnnotations.filter(
                (o) => o.geoEstimateId === estimate.id && o.fileId === file.id
              );
              const path = `company_${formData.companyId}/project_${project.id}/estimate_${estimate.id}/${file.name}`;
              filesData.push({
                ...file,
                name: file.name,
                annotations,
                path,
              });
            });
          });
        });
        setFilesData(filesData);
        setCurrentFileIndex(0);
      } else {
        await axios.post(`${serverApi}/download`, formData);
      }
    } catch (error) {
      console.error("Error downloading CSV:", error);
      setIsProcessing(false);
      setErrorMessage("An error occurred while processing the request.");
    }
  };

  const handleNextFile = () => {
    if (currentFileIndex < filesData.length - 1) {
      setCurrentFileIndex(currentFileIndex + 1);
    } else {
      setIsProcessing(false);
      setStatusMessage("Download successful!");
      console.log("All files processed");
    }
  };

  return (
    <div className="container">
      <>
        <h1>Download CSV</h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="companyId">Company ID:</label>
            <input
              type="text"
              id="companyId"
              name="companyId"
              value={formData.companyId}
              onChange={handleChange}
              required
              placeholder="Enter Company ID"
              className="no-bg-change"
            />
          </div>
          <div className="form-group">
            <label htmlFor="customPath">Custom Path (e.g., D:/path):</label>
            <input
              type="text"
              id="customPath"
              name="customPath"
              value={formData.customPath}
              onChange={handleChange}
              required
              placeholder="Enter Custom Path"
              className="no-bg-change"
            />
          </div>
          <div className="form-group">
            <label htmlFor="startRange">Start Range:</label>
            <input
              type="text"
              id="startRange"
              name="startRange"
              value={formData.startRange}
              onChange={handleChange}
              required
              placeholder="Enter Start Range"
              className="no-bg-change"
            />
          </div>
          <div className="form-group">
            <label htmlFor="endRange">End Range:</label>
            <input
              type="text"
              id="endRange"
              name="endRange"
              value={formData.endRange}
              onChange={handleChange}
              required
              placeholder="Enter End Range"
              className="no-bg-change"
            />
          </div>
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="isChecked"
              name="isChecked"
              checked={formData.isChecked}
              onChange={handleChange}
            />
            <label htmlFor="isChecked">Folder View</label>
          </div>
          <div className="checkbox-group">
            <input
              type="checkbox"
              id="downloadOnlyPdf"
              name="downloadOnlyPdf"
              checked={downloadOnlyPdf}
              onChange={(e) => setDownloadOnlyPdf(e.target.checked)}
            />
            <label htmlFor="downloadOnlyPdf">
              Download Only PDFs with Annotations
            </label>
          </div>
          <button
            type="submit"
            disabled={isProcessing}
            className={isProcessing ? "disabled-button" : ""}
          >
            Download CSV
          </button>
        </form>
        <div className="note">
          <p>Note: Make sure the custom path exists and is writable.</p>
        </div>
        <div
          className="status-message"
          style={{
            color:
              statusMessage.includes("start") ? "yellow" :
                statusMessage.includes("end") ? "green" :
                  statusMessage === "Download successful!" ? "green" : "#2ce5b3",
          }}
        >
          {statusMessage}
        </div>
        <div className="progress-bar">
          {!downloadOnlyPdf && <div className="progress-bar-inner" style={{ width: `${progress}%` }}>
            {progress}%
          </div>}

        </div>
        {errorMessage && <div className="error-message">{errorMessage}</div>}
      </>
      {filesData.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <PdfViewer
            key={currentFileIndex} // Ensure a new instance is created for each file
            fileBase64={filesData[currentFileIndex].base64File}
            annotations={filesData[currentFileIndex].annotations}
            filename={filesData[currentFileIndex].name} // Pass the filename as a prop
            onNextFile={handleNextFile}
            path={filesData[currentFileIndex].path}
            customPath={formData.customPath}
          />
        </div>
      )}
    </div>
  );
};

export default App;
