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
      };
    };
    sendMessageToCopilot: (message: string) => void;
    showCopilotSidebar: () => void;
    hideCopilotSidebar: () => void;
    showCopilotPopup: () => void;
    hideCopilotPopup: () => void;
  }
}

const CustomInput: React.FC<InputProps> = ({ inProgress, onSend, isVisible }) => {
  const [value, setValue] = useState("");

  if (!isVisible) {
    return null;
  }

  return (
    <textarea
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onSend(value);
          setValue("");
        }
      }}
      style={{
        maxHeight: "4em",
        overflow: "auto",
        width: "100%",
        boxSizing: "border-box",
      }}
      rows={1}
      disabled={inProgress}
    />
  );
};

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

  const replaceTitles = useCallback(() => {
    const titles = document.querySelectorAll("div.copilotKitHeader > div");
    titles.forEach((title) => {
      if (title.textContent === "CopilotKit") {
        title.textContent = "Vessium";
      }
    });
  }, []);

  useEffect(() => {
    if (showPopup || showSidebar) {
      replaceTitles();
    }
  }, [showPopup, showSidebar, replaceTitles]);

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
            initial: "Welcome to the spreadsheet app! How can I help you?",
          }}
          defaultOpen={true}
          clickOutsideToClose={false}
          showResponseButton={false}
          Input={CustomInput}
          onSetOpen={(open) => {
            if (!open) {
              hideCopilotPopup();
            }
          }}
        />
      )}

      {showSidebar && (
        <CopilotSidebar
          instructions={INSTRUCTIONS}
          labels={{
            initial: "Welcome to the spreadsheet app! How can I help you?",
          }}
          defaultOpen={true}
          clickOutsideToClose={false}
          showResponseButton={false}
          Input={CustomInput}
          onSetOpen={(open) => {
            if (!open) {
              hideCopilotSidebar();
            }
          }}
        />
      )}

      <Main />
    </CopilotKit>
  );
};

const Main = () => {
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
            return newSpreadsheets;
          });
        }}
      />
    </div>
  );
};

export default HomePage;
