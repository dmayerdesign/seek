import { faTrash } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { isEqual } from "lodash"
import { FC, useCallback, useContext, useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { AppCtx, Class, ClassWithStudents, Student, Teacher, TeacherData } from "../data-model"
import { getApiUrl } from "../utils"

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
	}, [firebaseApp, teacherEmail, teacherPassword])
	const signIn = useCallback(async () => {
		if (firebaseApp && teacherEmail && teacherPassword) {
			try {
				const result = await signInWithEmailAndPassword(getAuth(firebaseApp), teacherEmail, teacherPassword)
				setTeacherEmail("")
				setTeacherPassword("")
				console.log(`Logged in as ${result.user.email}!`)
			} catch (error) {
				console.error("Failed login:", error)
			}
		}
	}, [firebaseApp, teacherEmail, teacherPassword])
	const fetchTeacherData = useCallback(async () => {
		if (user) {
			try {
				const jwt = await user.getIdToken()
				const resp = await fetch(getApiUrl("getTeacherData"), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${jwt}`,
					},
					body: JSON.stringify({
						data: {}
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
				const resp = await fetch(getApiUrl("getLessonPlans"), {
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
					created_at: new Date().toISOString(),
					...teacherData,
					...teacherInput,
					updated_at: new Date().toISOString(),
				}
				if (!isEqual(teacher, teacherData)) {
					await fetch(getApiUrl("putTeacher"), {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Authorization": `Bearer ${jwt}`,
						},
						body: JSON.stringify({
							data: teacher,
						}),
					})
					fetchTeacherData()
				}
			} catch (e) {
				console.error(e)
			}
		}
	}, [user, teacherData])
	useEffect(() => {
		fetchTeacherData()
	}, [fetchTeacherData])

	const [studentsCtrl, setStudentsCtrl] = useState<Record<string, Student>>({})
	useEffect(() => {
		if (teacherData && teacherData.classes) {
			setStudentsCtrl(teacherData.classes.flatMap((c) => c.students ?? []).reduce((acc, s) => {
				acc[s.id] = s
				return acc
			}, {} as Record<string, Student>))
		}
	}, [teacherData])
	const createStudent = useCallback(async (cls: ClassWithStudents) => {
		if (user && teacherData) {
			const newStudent: Student = {
				id: uuidv4(),
				class_id: cls.id,
				nickname: "New student",
				notes: "",
				teacher_email: user.email!,
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString(),
			}
			// Update our local state
			const newClass: ClassWithStudents = {
				...cls,
				students: [
					...(cls.students ?? []),
					newStudent,
				],
			}
			const newClasses = [ ...teacherData.classes ]
			newClasses[newClasses.findIndex(c => c.id === cls.id)] = newClass
			setTeacherData(td => ({
				...td,
				classes: newClasses,
			}) as TeacherData)
			// Then update the database
			const jwt = await user.getIdToken()
			await fetch(getApiUrl("putStudent"), {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${jwt}`,
				},
				body: JSON.stringify({
					data: newStudent,
				}),
			})
		}
	}, [user, teacherData])
	const editStudent = useCallback(async (id: string, studentInput: Student) => {
		if (user) {
			try {
				const oldStudent = teacherData?.classes?.flatMap((c) => c.students).find(s => s.id === id)
				if (oldStudent && !isEqual(oldStudent, studentInput)) {
					const jwt = await user.getIdToken()
					await fetch(getApiUrl("putStudent"), {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
							"Authorization": `Bearer ${jwt}`,
						},
						body: JSON.stringify({
							data: {
								...studentInput,
								updated_at: new Date().toISOString(),
							},
						}),
					})
					fetchTeacherData()
				}
			} catch (e) {
				console.error(e)
			}
		}
	}, [user, teacherData])
	const deleteStudent = useCallback(async (studentId: string, classId: string) => {
		const newStudentsCtrl = { ...studentsCtrl }
		delete newStudentsCtrl[studentId]
		setStudentsCtrl(newStudentsCtrl)
		if (user) {
			try {
				const jwt = await user.getIdToken()
				await fetch(getApiUrl("deleteStudent"), {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						"Authorization": `Bearer ${jwt}`,
					},
					body: JSON.stringify({
						data: {
							id: studentId,
							class_id: classId,
						},
					}),
				})
				fetchTeacherData()
			} catch (e) {
				console.error(e)
			}
		}
	}, [user, teacherData, studentsCtrl])

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
							<button onClick={() => setFirstTimeUser(false)}>I already have one</button>
						</p>
						<div role="form">
							<div>
								<label htmlFor="email">Email</label>
								<input type="email" id="email" name="email" required
									className="large-input"
									value={teacherEmail}
									onChange={e => setTeacherEmail(e.target.value)}
								/>
							</div>

							<div>
								<label htmlFor="password">Password</label>
								<input type="password" id="password" name="password" required
									className="large-input"
									value={teacherPassword}
									onChange={e => setTeacherPassword(e.target.value)}
								/>
							</div>

							<button
								className="large-button"
								type="submit"
								onClick={() => {
									createAccount().then(() => {
										putAndSyncTeacherData({
											email_address: teacherEmail,
										})
									})
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
									className="large-input"
									value={teacherEmail}
									onChange={e => setTeacherEmail(e.target.value)}
								/>
							</div>

							<div>
								<label htmlFor="password">Password</label>
								<input type="password" id="password" name="password" required
									className="large-input"
									value={teacherPassword}
									onChange={e => setTeacherPassword(e.target.value)}
								/>
							</div>

							<button
								className="large-button"
								type="submit"
								onClick={() => {
									signIn().then(() => {
										fetchTeacherData()
									})
								}}
							>
								Log in
							</button>
						</div>
					</section>}
				</div>
				: <div className="page-content">
					<section>
						<h2>Set up your profile</h2>

						<div style={{ marginBottom: "10px" }}>
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
						<button onClick={async () => {
							await getAuth(firebaseApp).signOut()
							setTeacherData(undefined)
						}}>Sign out</button>
					</section>

					{!teacherData
					? <>
						<p>Loading...</p>
					</>
					: <>
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
								Classes and students
								<button onClick={async () => {
									const newClass: Class = {
										id: uuidv4(),
										name: "New class",
										teacher_email: user.email!,
										created_at: new Date().toISOString(),
										updated_at: new Date().toISOString(),
									}
									// Update our local state
									setTeacherData(td => ({
										...td,
										classes: [
											...(td?.classes ?? []),
											newClass,
										],
									}) as TeacherData)
									// Then update the database
									const jwt = await user.getIdToken()
									await fetch(getApiUrl("putClass"), {
										method: "POST",
										headers: {
											"Content-Type": "application/json",
											"Authorization": `Bearer ${jwt}`,
										},
										body: JSON.stringify({
											data: newClass,
										}),
									})
								}}>+ Add a class</button>
							</h2>

							{teacherData.classes?.map(c => <div key={c.id}>
								<h3 style={{ display: "flex", justifyContent: "space-between" }}>
									{c.name}
								</h3>
								<hr />
								<ul id="students">{c.students?.map(s => (
									studentsCtrl[s.id] &&
									<li key={s.id} style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
										<input className="inline-input"
											style={{ flexGrow: 1 }}
											value={studentsCtrl[s.id].nickname}
											onChange={(e) => {
												setStudentsCtrl(sc => ({
													...sc,
													[s.id]: {
														...sc[s.id],
														nickname: e.target.value,
													},
												}))
											}}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.currentTarget.blur()
												}
											}}
											onBlur={() => {
												setTimeout(() => {
													editStudent(s.id, studentsCtrl[s.id])
												})
											}}
										/>
										<button onClick={() => {
											deleteStudent(s.id, c.id)
										}}>
											<FontAwesomeIcon icon={faTrash} />
										</button>
									</li>
								))}</ul>
								<div style={{ marginTop: "20px" }}>
									<button onClick={() => {
										createStudent(c)
										setTimeout(() => {
											const newInput = document.querySelector("#students li:last-child input") as HTMLInputElement
											console.log("got new input?", newInput)
											newInput?.focus()
											setTimeout(() => {
												newInput?.select()
											})
										}, 250)
									}}>+ Add a student</button>
								</div>
							</div>)}
						</section>
					</>}
				</div>
			}
		</div>
	</div>
}

export default TeacherHome
