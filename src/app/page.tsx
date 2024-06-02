"use client";
import "@copilotkit/react-ui/styles.css";

import React, { useEffect, useState, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import SingleSpreadsheet from "./components/SingleSpreadsheet";
import { nanoid } from "nanoid"; // Make sure to add this import
import {
  CopilotKit,
  useCopilotAction,
  useCopilotReadable,
  useCopilotChat,
} from "@copilotkit/react-core";
import { CopilotPopup, CopilotSidebar, InputProps } from "@copilotkit/react-ui";
import { INSTRUCTIONS } from "./instructions";
import { canonicalSpreadsheetData } from "./utils/canonicalSpreadsheetData";
import { SpreadsheetData } from "./types";
import { PreviewSpreadsheetChanges } from "./components/PreviewSpreadsheetChanges";

declare global {
  interface Window {
    webkit: {
      messageHandlers: {
        copilotMessageProcessed: {
          postMessage: (message: string) => void;
        };
        copilotSidebarHidden: {
          postMessage: (message: string) => void;
        };
        copilotPopupHidden: {
          postMessage: (message: string) => void;
        };
        insertedItem: {
          postMessage: (message: string) => void;
        };
      };
    };
    sendMessageToCopilot: (message: string) => void;
    showCopilotSidebar: () => void;
    hideCopilotSidebar: () => void;
    showCopilotPopup: () => void;
    hideCopilotPopup: () => void;
  }
}

const EmptyInput: React.FC = () => null;
const EmptyButton: React.FC = () => null;

const HomePage = () => {
  const [showSidebar, setShowSidebar] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const showCopilotSidebar = () => {
    setShowSidebar(true);
  };

  const hideCopilotSidebar = () => {
    setShowSidebar(false);
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.copilotSidebarHidden) {
      window.webkit.messageHandlers.copilotSidebarHidden.postMessage("Copilot sidebar is hidden");
    } else {
      console.warn("Message handler 'copilotSidebarHidden' is not available.");
    }
  };

  const showCopilotPopup = () => {
    setShowPopup(true);
  };

  const hideCopilotPopup = () => {
    setShowPopup(false);
    if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.copilotPopupHidden) {
      window.webkit.messageHandlers.copilotPopupHidden.postMessage("Copilot popup is hidden");
    } else {
      console.warn("Message handler 'copilotPopupHidden' is not available.");
    }
  };

  useEffect(() => {
    window.showCopilotSidebar = showCopilotSidebar;
    window.hideCopilotSidebar = hideCopilotSidebar;
    window.showCopilotPopup = showCopilotPopup;
    window.hideCopilotPopup = hideCopilotPopup;
  }, []);

  useEffect(() => {
    const viewport = document.querySelector("meta[name=viewport]");
    if (viewport) {
      viewport.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no");
    }
  }, []);

  return (
    <CopilotKit
      runtimeUrl="/api/copilotkit"
      transcribeAudioUrl="/api/transcribe"
      textToSpeechUrl="/api/tts"
    >
      {showPopup && (
        <CopilotPopup
          instructions={INSTRUCTIONS}
          labels={{
            title: "Vessium",
            initial: "Hi there! 👋 I can help you organize your data.",
          }}
          defaultOpen={true}
          clickOutsideToClose={false}
          showResponseButton={false}
          onSetOpen={(open) => {
            if (!open) {
              hideCopilotPopup();
            }
          }}
          Button={EmptyButton}
          Input={EmptyInput}
        />
      )}

      {showSidebar && (
        <CopilotSidebar
          instructions={INSTRUCTIONS}
          labels={{
            title: "Vessium",
            initial: "Hi there! 👋 I can help you organize your data.",
          }}
          defaultOpen={true}
          clickOutsideToClose={false}
          showResponseButton={false}
          onSetOpen={(open) => {
            if (!open) {
              hideCopilotSidebar();
            }
          }}
          Button={EmptyButton}
          Input={EmptyInput}
        />
      )}

      <Main />
    </CopilotKit>
  );
};

const Main: React.FC = () => {
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetData[]>([
    {
      title: "Spreadsheet 1",
      rows: [
        [{ value: "" }, { value: "" }, { value: "" }],
        [{ value: "" }, { value: "" }, { value: "" }],
        [{ value: "" }, { value: "" }, { value: "" }],
      ],
    },
  ]);

  const [selectedSpreadsheetIndex, setSelectedSpreadsheetIndex] = useState(0);

  const { append } = useCopilotChat({
    id: "spreadsheetAppChat",
  });

  const sendMessageToCopilot = useCallback((message: string) => {
    append({ id: nanoid(), content: message, role: "user" })
      .then(() => {
        console.log("Message processed by CopilotKit");
        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.copilotMessageProcessed) {
          window.webkit.messageHandlers.copilotMessageProcessed.postMessage("Message processed by CopilotKit");
        } else {
          console.warn("Message handler 'copilotMessageProcessed' is not available.");
        }
      });
  }, [append]);

  useEffect(() => {
    window.sendMessageToCopilot = sendMessageToCopilot;
  }, [sendMessageToCopilot]);

  useCopilotAction({
    name: "createSpreadsheet",
    description: "Create a new spreadsheet",
    parameters: [
      {
        name: "rows",
        type: "object[]",
        description: "The rows of the spreadsheet",
        attributes: [
          {
            name: "cells",
            type: "object[]",
            description: "The cells of the row",
            attributes: [
              {
                name: "value",
                type: "string",
                description: "The value of the cell",
              },
            ],
          },
        ],
      },
      {
        name: "title",
        type: "string",
        description: "The title of the spreadsheet",
      },
    ],
    render: (props) => {
      const { rows, title } = props.args;
      const newRows = canonicalSpreadsheetData(rows);

      return (
        <PreviewSpreadsheetChanges
          preCommitTitle="Create spreadsheet"
          postCommitTitle="Spreadsheet created"
          newRows={newRows}
          commit={(rows) => {
            const newSpreadsheet: SpreadsheetData = {
              title: title || "Untitled Spreadsheet",
              rows: rows,
            };
            setSpreadsheets((prev) => [...prev, newSpreadsheet]);
            setSelectedSpreadsheetIndex(spreadsheets.length);
          }}
        />
      );
    },
    handler: ({ rows, title }) => {
      // Do nothing.
      // The preview component will optionally handle committing the changes.
    },
  });

  useCopilotReadable({
    description: "Today's date",
    value: new Date().toLocaleDateString(),
  });

  return (
    <div className="flex">
      {/*
      <Sidebar
        spreadsheets={spreadsheets}
        selectedSpreadsheetIndex={selectedSpreadsheetIndex}
        setSelectedSpreadsheetIndex={setSelectedSpreadsheetIndex}
      />
  */}
      <SingleSpreadsheet
        spreadsheet={spreadsheets[selectedSpreadsheetIndex]}
        setSpreadsheet={(spreadsheet) => {
          setSpreadsheets((prev) => {
            console.log("setSpreadsheet", spreadsheet);
            const newSpreadsheets = [...prev];
            newSpreadsheets[selectedSpreadsheetIndex] = spreadsheet;
            if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.insertedItem) {
              window.webkit.messageHandlers.insertedItem.postMessage(JSON.stringify(spreadsheet));
            } else {
              console.warn("Message handler 'insertedItem' is not available.");
            }
            return newSpreadsheets;
          });
        }}
      />
    </div>
  );
};

export default HomePage;
