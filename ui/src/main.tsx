import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider } from "react-router-dom"
import App from "./App"
import "./main.css"
import AppForStudents from "./pages/AppForStudents"
import AppForTeachers from "./pages/AppForTeachers"
import AppHome from "./pages/AppHome"

const router = createBrowserRouter([
	{
		path: "/",
		element: <App />,
		children: [
			{
				path: "",
				element: <AppHome />,
			},
			{
				path: "for-students",
				element: <AppForStudents />,
			},
			{
				path: "for-teachers",
				element: <AppForTeachers />,
			},
		],
	},
	{
		path: "*",
		element: <div>Not Found</div>,
	},
])

const container = document.getElementById("root")
const root = createRoot(container!)
root.render(<RouterProvider router={router} />)
