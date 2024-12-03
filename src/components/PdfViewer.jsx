/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";
import WebViewer from "@pdftron/webviewer";
import axios from "axios";

const PdfViewer = ({ fileBase64, annotations, filename, onNextFile, path, customPath }) => {
  const viewer = useRef(null);
  const serverApi = import.meta.env.REACT_APP_SERVER_API || "http://localhost:8080";

  useEffect(() => {
    const loadDocumentWithAnnotations = async (instance) => {
      const { documentViewer, annotationManager } = instance.Core;

      // Load the base64-encoded PDF
      instance.UI.loadDocument(`data:application/pdf;base64,${fileBase64}`, {
        filename: filename,
      });

      // Add annotations after the document is loaded
      documentViewer.addEventListener("documentLoaded", async () => {
        annotations.forEach((annotation) => {
          const xfdfString = annotation.xfdf;
          annotationManager.importAnnotations(xfdfString);
        });

        // Wait for annotations to be imported
        await annotationManager.exportAnnotations();

        // Get the PDF with annotations
        const doc = documentViewer.getDocument();
        const xfdfString = await annotationManager.exportAnnotations();
        const data = await doc.getFileData({ xfdfString });
        const blob = new Blob([new Uint8Array(data)], {
          type: "application/pdf",
        });

        // Send the PDF to the backend API
        const formData = new FormData();
        formData.append("file", blob, filename);
        formData.append("path", path);
        formData.append("customPath", customPath);


        await axios.post(`${serverApi}/upload`, formData);

        onNextFile();
      });
    };

    WebViewer(
      {
        path: "/webviewer",
        licenseKey:
          "Rukkor AB:OEM:Geometra::B+:AMS(20260604):B9B6BF03B61CA35809994E616F7F4DF2D3F13F427DFA9F873E8E4AB431F5C7",
      },
      viewer.current
    ).then((instance) => {
      loadDocumentWithAnnotations(instance);
    });
  }, [fileBase64, annotations, filename, onNextFile, path]);

  return (
    <div className="PdfViewer">
      <div ref={viewer} style={{ height: "200px" }}></div>
    </div>
  );
};

export default PdfViewer;
