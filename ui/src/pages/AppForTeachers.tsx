import { FC, useEffect, useState } from "react"
import { Teacher, TeacherData } from "../data-model"

const TEST_TEACHER_ID = "xdlHYMIvhluulT1FPe0q"

const AppForTeachers: FC = () => {
	const [teacherData, setTeacherData] = useState<TeacherData>()
	useEffect(() => {
		fetch(import.meta.env.VITE_API_URL + "/getTeacherData?teacher_id=" + TEST_TEACHER_ID)
			.then((data) => {
				data.json().then((json) => setTeacherData(json))
			})
			.catch((e) => {
				console.error(e)
			})
	}, [])

	return (
		<div className="light">
			<header>
				<div className="page-content">
					<img
						src="/seek-logo-dark.png"
						className="seek-logo"
						style={{ height: "18px", width: "auto" }}
						alt="SEEK"
					/>
				</div>
			</header>
			<div className="seek-page">
				<div className="page-content">
					<section>
						<h2>Set up your profile</h2>
						<input
							id="teacher-profile-name"
							className="input"
							placeholder="What do students call you?"
							style={{
								width: "100%",
								maxWidth: "400px",
							}}
						/>
					</section>

					<section>
						<h2>
							Lessons
							<button>+ New lesson</button>
						</h2>

						<ul>
							<li>
								<h3>
									<span className="supertitle">Last edited {new Date().toLocaleString()}</span>
									Untitled Lesson
								</h3>
							</li>
							<li>
								<h3>
									<span className="supertitle">Last edited {new Date().toLocaleString()}</span>
									Lesson 1
								</h3>
							</li>
						</ul>
					</section>

					<section>
						<h2>
							Students
							<button>+ Add a class</button>
						</h2>

						<div>
							<h3>
								1st period biology
								<button>+ Add a student</button>
							</h3>
							<ul>
								<li>Mayer, Daniel</li>
								<li>Shanbhogue, Esha</li>
							</ul>
						</div>

						<div>
							<h3>
								2nd period physics
								<button>+ Add a student</button>
							</h3>
							<ul>
								<li>Mayer, Daniel</li>
								<li>Shanbhogue, Esha</li>
							</ul>
						</div>
					</section>
				</div>
			</div>
		</div>
	)
}

export default AppForTeachers
