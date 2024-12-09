import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom"
import App from "./App"
import "./main.css"
import AppForStudents from "./pages/AppForStudents"
import AppForTeachers from "./pages/AppForTeachers"
import AppHome from "./pages/AppHome"
import TeacherHome from "./pages/TeacherHome"

const router = createBrowserRouter([
	{
		path: "/",
		element: <App />,
		children: [
			{
				path: "",
				element: <Navigate to="/for-teachers/home" replace />,
			},
			{
				path: "for-teachers",
				element: <AppForTeachers />,
				children: [
					{
						path: "",
						element: <Navigate to="/for-teachers/home" replace />,
					},
					{
						path: "home",
						element: <TeacherHome />,
					},
					{
						path: "create-lesson-plan",
						element: <div>TODO: Add lesson plan</div>,
					},
					{
						path: "edit-lesson-plan",
						element: <div>TODO: Edit lesson plan</div>,
					},
					{
						path: "lesson",
						element: <div>TODO: Administer a lesson</div>,
					},
					{
						path: "*",
						element: <Navigate to="/for-teachers/home" replace />,
					}
				]
			},
			{
				path: ":lessonId",
				element: <AppForStudents />,
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
