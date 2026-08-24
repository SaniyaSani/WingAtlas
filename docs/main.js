import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { jsx } from "react/jsx-runtime";
import Home from "./app/page.js";
const root=document.getElementById("root");
if(!root) throw new Error("EntoWing root element was not found.");
createRoot(root).render(jsx(StrictMode,{children:jsx(Home,{})}));
