import { createRoot } from "react-dom/client";
import { RiverholdApp } from "./RiverholdApp";
import "./styles.css";

const root = document.getElementById("root");
if (!root) throw new Error("Riverhold root is missing");
createRoot(root).render(<RiverholdApp />);
