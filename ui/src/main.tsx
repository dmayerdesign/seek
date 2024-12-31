import { createRoot } from "react-dom/client"
import { createBrowserRouter, RouterProvider, Navigate } from "react-router-dom"
import App from "./App"
import "./main.css"
import AppForStudents from "./pages/AppForStudents"
import AppForTeachers from "./pages/AppForTeachers"
import AppHome from "./pages/AppHome"
import TeacherHome from "./pages/TeacherHome"
import Lesson from "./pages/Lesson"
import LessonPlan from "./pages/LessonPlan"

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
						path: "lesson-plans/:id",
						element: <LessonPlan />,
					},
					{
						path: "lessons/:id",
						element: <Lesson />,
					},
					{
						path: "*",
						element: <Navigate to="/for-teachers/home" replace />,
					},
				],
			},
			{
				path: ":teacherEmail/:lessonId",
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
