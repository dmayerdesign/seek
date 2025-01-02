import { faTrashCan } from "@fortawesome/free-regular-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { isEqual } from "lodash"
import { FC, useCallback, useContext, useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { AppCtx, Class, ClassWithStudents, LessonPlan, LessonPlanWithQuestions, LessonQuestion, Student, Teacher, TeacherData } from "../data-model"
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import LessonPlans from "../components/LessonPlans"
import Lessons from "../components/Lessons"

const TeacherHome: FC = () => {
	const { user, firebaseApp, callCloudFunction } = useContext(AppCtx)!
	const [teacherData, setTeacherData] = useState<TeacherData|null>()
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
	// Sign up/in, teacher data CRUD
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

	// CRUD
	const [crudError, setCrudError] = useState<string>()
	const fetchTeacherData = useCallback(async () => {
		if (user) {
			setTeacherData(undefined)
			try {
				const newTeacherData = await callCloudFunction<TeacherData>("getTeacherData", {})
				if (newTeacherData) {
					setTeacherData(newTeacherData)
					fetchLessonPlans()
				} else {
					setTeacherData(null)
				}
			} catch (e) {
				setCrudError((e as Error).toString())
				setTeacherData(null)
			}
		}
	}, [user])
	const fetchLessonPlans = useCallback(async () => {
		if (user) {
			const newLessonPlans = await callCloudFunction<LessonPlan[]>("getLessonPlans", {})
			console.log("got lesson plans", newLessonPlans)
		}
	}, [user])
	const putTeacherData = useCallback(
		async (teacherInput: Partial<Teacher>) => {
			if (user) {
				try {
					const _teacherData = { ...teacherData } as Partial<TeacherData>
					delete _teacherData.classes
					delete _teacherData.lesson_plans
					delete _teacherData.lessons
					const teacher = {
						id: uuidv4(),
						user_id: user?.uid,
						email_address: user?.email ?? "",
						nickname: teacherInput.nickname ?? "",
						created_at: new Date().toISOString(),
						..._teacherData,
						...teacherInput,
					} as Teacher
					if (!isEqual(teacher, _teacherData)) {
						teacher.updated_at = new Date().toISOString()
						setTeacherData((td) => ({
							...td,
							...teacher,
							classes: td?.classes,
							lesson_plans: td?.lesson_plans,
							lessons: td?.lessons,
						}) as TeacherData)
						await callCloudFunction("putTeacher", teacher)
					}
				} catch (e) {
					setCrudError((e as Error).toString())
					console.error(e)
				}
			}
		},
		[user, teacherData],
	)
	useEffect(() => {
		fetchTeacherData()
	}, [fetchTeacherData])

	// Classes/students CRUD
	const [classesCtrl, setClassesCtrl] = useState<Record<string, Class>>({})
	const [studentsCtrl, setStudentsCtrl] = useState<Record<string, Student>>({})
	useEffect(() => {
		if (teacherData && teacherData.classes) {
			setClassesCtrl(
				teacherData.classes
					.reduce(
						(acc, s) => {
							acc[s.id] = s
							return acc
						},
						{} as Record<string, Class>,
					)
			)
			setStudentsCtrl(
				teacherData.classes
					.flatMap((c) => c.students ?? [])
					.reduce(
						(acc, s) => {
							acc[s.id] = s
							return acc
						},
						{} as Record<string, Student>,
					),
			)
		}
	}, [teacherData])
	const createStudent = useCallback(
		async (cls: ClassWithStudents) => {
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
					students: [...(cls.students ?? []), newStudent],
				}
				const newClasses = [...teacherData.classes]
				newClasses[newClasses.findIndex((c) => c.id === cls.id)] = newClass
				setTeacherData(
					(td) =>
						({
							...td,
							classes: newClasses,
						}) as TeacherData,
				)
				// Then update the database
				await callCloudFunction("putStudent", newStudent)
			}
		},
		[user, teacherData],
	)
	const editStudent = useCallback(
		async (id: string, studentInput: Student) => {
			if (user) {
				try {
					const cls = teacherData?.classes?.find((c) => c.id === studentInput.class_id)
					const oldStudent = cls?.students.find((s) => s.id === id)
					if (teacherData && cls && oldStudent && !isEqual(oldStudent, studentInput)) {
						// Update our local state
						const newStudents = [...cls.students]
						newStudents[newStudents.findIndex((s) => s.id === id)] = studentInput
						const newClass: ClassWithStudents = { ...cls, students: newStudents }
						const newClasses = [...teacherData.classes]
						newClasses[newClasses.findIndex((c) => c.id === cls.id)] = newClass
						setTeacherData(
							(td) =>
								({
									...td,
									classes: newClasses,
								}) as TeacherData,
						)
						// Then update the database
						await callCloudFunction("putStudent", {
							...studentInput,
							updated_at: new Date().toISOString(),
						})
						// fetchTeacherData()
					}
				} catch (e) {
					setCrudError((e as Error).toString())
					console.error(e)
				}
			}
		},
		[user, teacherData],
	)
	const deleteStudent = useCallback(
		async (studentId: string, classId: string) => {
			const newStudentsCtrl = { ...studentsCtrl }
			delete newStudentsCtrl[studentId]
			setStudentsCtrl(newStudentsCtrl)
			if (user) {
				await callCloudFunction("deleteStudent", {
					id: studentId,
					class_id: classId,
				})
			}
		},
		[user, teacherData, studentsCtrl],
	)
	const createClass = useCallback(
		async () => {
			if (user) {
				const newClass: Class = {
					id: uuidv4(),
					name: "New class",
					teacher_email: user.email!,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				}
				// Update our local state
				setTeacherData(
					(td) =>
						({
							...td,
							classes: [...(td?.classes ?? []), newClass],
						}) as TeacherData,
				)
				// Then update the database
				await callCloudFunction("putClass", newClass)
			}
		},
		[user],
	)
	const editClass = useCallback(
		async (id: string, classInput: Class) => {
			if (user) {
				try {
					const oldClassWithStudents = teacherData?.classes?.find((c) => c.id === id)
					if (teacherData && oldClassWithStudents) {
						const { students, ...oldClassPlain } = oldClassWithStudents
						const newClassPlain = { ...oldClassPlain, ...classInput }
						const newClassWithStudents = { ...oldClassWithStudents, ...classInput }
						if (!isEqual(oldClassPlain, newClassPlain)) {
							// Update our local state
							const newClasses = [...teacherData.classes]
							newClasses[newClasses.findIndex((c) => c.id === newClassWithStudents.id)] = newClassWithStudents
							setTeacherData(
								(td) =>
									({
										...td,
										classes: newClasses,
									}) as TeacherData,
							)
							// Then update the database
							await callCloudFunction("putClass", {
								...newClassPlain,
								updated_at: new Date().toISOString(),
							})
							// fetchTeacherData()
						}
					}
				} catch (e) {
					setCrudError((e as Error).toString())
					console.error(e)
				}
			}
		},
		[user, teacherData],
	)
	const deleteClass = useCallback(
		async (classId: string) => {
			if (user) {
				try {
					await callCloudFunction("deleteClass", { id: classId })
					fetchTeacherData()
				} catch (e) {
					setCrudError((e as Error).toString())
					console.error(e)
				}
			}
		},
		[user],
	)

	return (
		<div className="light">
			<div className="seek-page">
				{crudError ? (
					<>
						<div className="page-content">
							<p>Oops -- there was an error trying to load the page. Refresh the page to try again.</p>
						</div>
					</>
				) : user === undefined ? (
					<>
						<div className="page-content">
							<p>Loading...</p>
						</div>
					</>
				) : user === null ? (
					<div className="page-content">
						{firstTimeUser ? (
							<section className="faint-bg">
								<div className="content-gutters">
									<h1>Create your teacher account</h1>
									<p>
										<button onClick={() => setFirstTimeUser(false)}>I already have one</button>
									</p>
									<div role="form">
										<div>
											<label htmlFor="email">Email</label>
											<input
												type="email"
												id="email"
												name="email"
												required
												className="large-input"
												value={teacherEmail}
												onChange={(e) => setTeacherEmail(e.target.value)}
											/>
										</div>

										<div>
											<label htmlFor="password">Password</label>
											<input
												type="password"
												id="password"
												name="password"
												required
												className="large-input"
												value={teacherPassword}
												onChange={(e) => setTeacherPassword(e.target.value)}
											/>
										</div>

										<button
											className="large-button"
											type="submit"
											onClick={() => {
												createAccount().then(() => {
													putTeacherData({
														email_address: teacherEmail,
													})
												})
											}}
										>
											Create Account
										</button>
									</div>
								</div>
							</section>
						) : (
							<section className="faint-bg">
								<div className="content-gutters">
									<h1>Sign into your teacher account</h1>
									<p>
										<button onClick={() => setFirstTimeUser(true)}>I don't have an account</button>
									</p>
									<div role="form">
										<div>
											<label htmlFor="email">Email</label>
											<input
												type="email"
												id="email"
												name="email"
												required
												className="large-input"
												value={teacherEmail}
												onChange={(e) => setTeacherEmail(e.target.value)}
											/>
										</div>

										<div>
											<label htmlFor="password">Password</label>
											<input
												type="password"
												id="password"
												name="password"
												required
												className="large-input"
												value={teacherPassword}
												onChange={(e) => setTeacherPassword(e.target.value)}
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
								</div>
							</section>
						)}
					</div>
				) : (
					<div className="page-content">
						{teacherData === undefined ? (
							<>
								<p>Loading...</p>
							</>
						) : (
							<>
								<section className="faint-bg">
									<div className="content-gutters">
										<h2>Set up your profile</h2>
									</div>
									<hr />
									<div className="content-gutters">
										<div style={{ marginBottom: "10px" }}>
											<label htmlFor="teacher-profile-name">Your name</label>
											<div style={{ fontSize: "2.4rem" }}>
												<input
													ref={teacherNameInputRef}
													id="teacher-profile-name"
													className="inline-input"
													placeholder="What do students call you?"
													style={{
														width: "100%",
														maxWidth: "400px",
														marginTop: "5px",
													}}
													value={teacherNickname}
													onChange={(e) => setTeacherNickname(e.target.value)}
													onKeyDown={(e) => {
														if (e.key === "Enter") {
															teacherNameInputRef.current?.blur()
														}
													}}
													onBlur={() => {
														setTimeout(() => {
															putTeacherData({
																nickname: teacherNickname,
															})
														})
													}}
												/>
											</div>
										</div>
									</div>
								</section>
								{teacherData && <section className="faint-bg">
									<Lessons
										teacherData={teacherData}
										setTeacherData={setTeacherData}
										refreshTeacherData={fetchTeacherData}
									/>
								</section>}

								{teacherData && <section className="faint-bg">
									<LessonPlans
										teacherData={teacherData}
										setTeacherData={setTeacherData}
										refreshTeacherData={fetchTeacherData}
									/>
								</section>}

								<section className="faint-bg">
									<div className="content-gutters">
										<h2 style={{ display: "flex", justifyContent: "space-between" }}>
											Classes and students
											<button
												onClick={() => createClass()}
											>
												+ Add a class
											</button>
										</h2>
									</div>
									<hr />
									<div className="content-gutters">
										{teacherData?.classes?.map((c) => classesCtrl[c.id] && (
											<div key={c.id}>
												<h3 style={{ display: "flex", justifyContent: "space-between", marginTop: "35px" }}>
													<input
														className="inline-input"
														style={{ flexGrow: 1 }}
														value={classesCtrl[c.id].name}
														onChange={(e) => {
															setClassesCtrl((cc) => ({
																...cc,
																[c.id]: {
																	...cc[c.id],
																	name: e.target.value,
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
																editClass(c.id, classesCtrl[c.id])
															})
														}}
													/>
													<button
														onClick={() => {
															if (window.confirm(`Are you sure you want to delete ${c.name}?`)) {
																deleteClass(c.id)
															}
														}}
													>
														<FontAwesomeIcon icon={faTrashCan} />
													</button>
												</h3>
												<hr />
												<ul id="students">
													{c.students?.map(
														(s) =>
															studentsCtrl[s.id] && (
																<li
																	key={s.id}
																	style={{
																		display: "flex",
																		justifyContent: "space-between",
																		gap: "20px",
																	}}
																>
																	<input
																		className="inline-input"
																		style={{ flexGrow: 1 }}
																		value={studentsCtrl[s.id].nickname}
																		onChange={(e) => {
																			setStudentsCtrl((sc) => ({
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
																	<button
																		onClick={() => {
																			deleteStudent(s.id, c.id)
																		}}
																	>
																		<FontAwesomeIcon icon={faTrashCan} />
																	</button>
																</li>
															),
													)}
												</ul>
												<div style={{ marginTop: "10px", marginLeft: "20px" }}>
													<button
														onClick={() => {
															createStudent(c)
														}}
													>
														+ Add a student
													</button>
												</div>
											</div>
										))}
									</div>
								</section>
							</>
						)}
					</div>
				)}
			</div>
		</div>
	)
}

export default TeacherHome
