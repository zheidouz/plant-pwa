import { createHashRouter, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Today from "./routes/Today";
import Plant from "./routes/Plant";
import MyPlants from "./routes/MyPlants";
import Settings from "./routes/Settings";

// HashRouter (not BrowserRouter) so static hosting + Firebase Hosting SPA
// rewrites both work without server config. The notification deep-link
// "#/today" lands on the Today screen via the explicit /today route below.
export const router = createHashRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { index: true, element: <Navigate to="/today" replace /> },
      { path: "today", element: <Today /> },
      { path: "my-plants", element: <MyPlants /> },
      { path: "settings", element: <Settings /> },
      { path: "plant/:id", element: <Plant /> },
      { path: "*", element: <Navigate to="/today" replace /> },
    ],
  },
]);
