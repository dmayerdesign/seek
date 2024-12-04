import { FC, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { AppCtx, Teacher, TeacherData } from "../data-model"
import { v4 as uuidv4 } from "uuid"
import { isEqual } from "lodash"
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "firebase/auth"

const TeacherHome: FC = () => {
	const { user, firebaseApp } = useContext(AppCtx)!
	const [teacherData, setTeacherData] = useState<TeacherData>()
	const [firstTimeUser, setFirstTimeUser] = useState(false)
	const teacherNameInputRef = useRef<HTMLInputElement>(null)
	const [teacherEmail, setTeacherEmail] = useState("")
	const [teacherPassword, setTeacherPassword] = useState("")
	const [teacherNickname, setTeacherNickname] = useState("")
	useEffect(() => {
		if (teacherData && teacherNickname !== teacherData.nickname) {
			setTeacherNickname(teacherData.nickname)
		}
	}, [teacherData])

	const createAccount = useCallback(async () => {
		if (firebaseApp && teacherEmail && teacherPassword) {
			try {
				const result = await createUserWithEmailAndPassword(getAuth(firebaseApp), teacherEmail, teacherPassword)
				console.log(`Signed up as ${result.user.email}!`)
			} catch (error) {
				console.error("Failed sign up:", error)
				// Try to sign in instead
				await signIn()
			}
		}
	}, [firebaseApp])
	const signIn = useCallback(async () => {
		if (firebaseApp && teacherEmail && teacherPassword) {
			try {
				const result = await signInWithEmailAndPassword(getAuth(firebaseApp), teacherEmail, teacherPassword)
				console.log(`Logged in as ${result.user.email}!`)
			} catch (error) {
				console.error("Failed login:", error)
			}
		}
	}, [firebaseApp])
	const fetchTeacherData = useCallback(async () => {
		if (user) {
			try {
				const jwt = await user.getIdToken()
				const resp = await fetch(import.meta.env.VITE_API_URL + "/getTeacherData", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${jwt}`,
					},
					body: JSON.stringify({
						data: {
							email_address: user.email,
						}
					}),
				})
				const json = await resp.json()
				const newTeacherData = json.result as TeacherData | null
				if (newTeacherData) {
					setTeacherData(newTeacherData)
					fetchLessonPlans()
				}
			}
			catch (e) {
				console.error(e)
			}
		}
	}, [user])
	const fetchLessonPlans = useCallback(async () => {
		if (user) {
			try {
				const jwt = await user.getIdToken()
				const resp = await fetch(import.meta.env.VITE_API_URL + "/getLessonPlans", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${jwt}`,
					},
					body: JSON.stringify({ data: {} }),
				})
				const json = await resp.json()
				const newLessonPlans = json.result as TeacherData | null
				if (newLessonPlans) {
					console.log(newLessonPlans)
				}
			}
			catch (e) {
				console.error(e)
			}
		}
	}, [user])
	const putAndSyncTeacherData = useCallback(async (teacherInput: Partial<Teacher>) => {
		if (user) {
			try {
				const jwt = await user.getIdToken()
				const teacher: Teacher = {
					id: uuidv4(),
					user_id: user?.uid,
					email_address: user?.email ?? "",
					nickname: teacherInput.nickname ?? "",
					...teacherData,
					...teacherInput,
				}
				if (!isEqual(teacher, teacherData)) {
					fetch(import.meta.env.VITE_API_URL + "/putTeacher", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Authorization": `Bearer ${jwt}`,
						},
						body: JSON.stringify({
							data: teacher,
						}),
					})
						.then(() => {
							fetchTeacherData()
						})
						.catch((e) => {
							console.error(e)
						})
				}
			} catch (e) {
				console.error(e)
			}
		}
	}, [user, teacherData])
	useEffect(() => {
		fetchTeacherData()
	}, [fetchTeacherData])

	return <div className="light">
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
			{user === undefined
				? <>
					<div className="page-content">
						<p>Loading...</p>
					</div>
				</>
				: user === null
				? <div className="page-content">
					{firstTimeUser
					? <section>
						<h1>Create your teacher account</h1>
						<p>
							<button onClick={() => setFirstTimeUser(true)}>I already have one</button>
						</p>
						<div role="form">
							<div>
								<label htmlFor="email">Email</label>
								<input type="email" id="email" name="email" required
									value={teacherEmail}
									onChange={e => setTeacherEmail(e.target.value)}
								/>
							</div>

							<div>
								<label htmlFor="password">Password</label>
								<input type="password" id="password" name="password" required
									value={teacherPassword}
									onChange={e => setTeacherPassword(e.target.value)}
								/>
							</div>

							<button
								type="submit"
								onClick={() => {
									createAccount().then(() => {})
								}}
							>
								Create Account
							</button>
						</div>
					</section>
					: <section>
						<h1>Sign into your teacher account</h1>
						<p>
							<button onClick={() => setFirstTimeUser(true)}>I don't have an account</button>
						</p>
						<div role="form">
							<div>
								<label htmlFor="email">Email</label>
								<input type="email" id="email" name="email" required
									value={teacherEmail}
									onChange={e => setTeacherEmail(e.target.value)}
								/>
							</div>

							<div>
								<label htmlFor="password">Password</label>
								<input type="password" id="password" name="password" required
									value={teacherPassword}
									onChange={e => setTeacherPassword(e.target.value)}
								/>
							</div>

							<button
								type="submit"
								onClick={() => { signIn() }}
							>
								Log in
							</button>
						</div>
					</section>}
				</div>
				: <div className="page-content">
					<section>
						<h2>Set up your profile</h2>

						<div>
							<label htmlFor="teacher-profile-name">Your name</label>
							<input ref={teacherNameInputRef}
								id="teacher-profile-name"
								className="input"
								placeholder="What do students call you?"
								style={{
									width: "100%",
									maxWidth: "400px",
								}}
								value={teacherNickname}
								onChange={e => setTeacherNickname(e.target.value)}
								onKeyDown={e => {
									if (e.key === "Enter") {
										teacherNameInputRef.current?.blur()
									}
								}}
								onBlur={() => {
									setTimeout(() => {
										putAndSyncTeacherData({
											nickname: teacherNickname,
										})
									})
								}}
							/>
						</div>
					</section>

					{teacherData && <>
						<section>
							<h2 style={{ display: "flex", justifyContent: "space-between" }}>
								Lessons
								<button>+ Begin lesson</button>
							</h2>

							<ul>
								<li>
									<h3>
										<a href="/">Untitled lesson</a>
									</h3>
								</li>
							</ul>
						</section>

						<section>
							<h2 style={{ display: "flex", justifyContent: "space-between" }}>
								Lesson plans
								<button>+ New lesson plan</button>
							</h2>

							<ul>
								<li>
									<h3>
										<a href="/">Untitled lesson plan</a>
									</h3>
								</li>
							</ul>
						</section>

						<section>
							<h2 style={{ display: "flex", justifyContent: "space-between" }}>
								Students
								<button>+ Add a class</button>
							</h2>

							{teacherData.classes.map(c => <div key={c.id}>
								<h3 style={{ display: "flex", justifyContent: "space-between" }}>
									{c.name}
									<button>+ Add a student</button>
								</h3>
							</div>)}
							<div>
								<h3 style={{ display: "flex", justifyContent: "space-between" }}>
									1st period biology
									<button>+ Add a student</button>
								</h3>
								<hr />
								<ul>
									<li>Mayer, Daniel</li>
									<li>Shanbhogue, Esha</li>
								</ul>
							</div>

							<div>
								<h3 style={{ display: "flex", justifyContent: "space-between" }}>
									2nd period physics
									<button>+ Add a student</button>
								</h3>
								<hr />
								<ul>
									<li>Mayer, Daniel</li>
									<li>Shanbhogue, Esha</li>
								</ul>
							</div>
						</section>
					</>}
				</div>
			}
		</div>
	</div>
}

export default TeacherHome
