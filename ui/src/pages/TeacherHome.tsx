import { faTrashCan } from "@fortawesome/free-regular-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { isEqual } from "lodash"
import { FC, useCallback, useContext, useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import LessonPlans from "../components/LessonPlans"
import Lessons from "../components/Lessons"
import { AppCtx, Class, ClassWithStudents, LessonPlan, Student, Teacher, TeacherData } from "../data-model"

const TeacherHome: FC = () => {
	const { user, firebaseApp, callCloudFunction } = useContext(AppCtx)!
	const [teacherData, setTeacherData] = useState<TeacherData | null>()
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
	const [submittingSignUp, setSubmittingSignUp] = useState(false)
	// Sign up/in, teacher data CRUD
	const createAccount = useCallback(
		() =>
			new Promise<void>((resolve, reject) => {
				if (firebaseApp && teacherEmail && teacherPassword) {
					setSubmittingSignUp(true)
					createUserWithEmailAndPassword(getAuth(firebaseApp), teacherEmail, teacherPassword)
						.then((result) => {
							console.log(`Signed up as ${result.user.email}!`)
							if (result.user) {
								const teacher = {
									id: uuidv4(),
									nickname: "",
									user_id: result.user?.uid, // Back end ignores this, reads it from JWT
									email_address: result.user?.email ?? "", // Back end ignores this, reads it from JWT
									created_at: new Date().toISOString(),
									updated_at: new Date().toISOString(),
								} as Teacher
								setTeacherData(
									(td) =>
										({
											...td,
											...teacher,
										}) as TeacherData,
								)
								result.user.getIdToken().then((jwt) => {
									// Make sure the new user has propagated across the backend
									setTimeout(() => {
										callCloudFunction("putTeacher", teacher, `Bearer ${jwt}`)
											.then(() =>
												setTimeout(() => {
													fetchTeacherData().then(() => resolve())
												}),
											)
											.catch((e) => {
												setCrudError((e as Error).toString())
												console.error(e)
												reject()
											})
									}, 1000)
								})
							}
						})
						.catch((error) => {
							console.error("Failed sign up:", error)
							// Try to sign in instead
							signIn()
						})
						.finally(() => {
							setSubmittingSignUp(false)
						})
				}
			}),
		[firebaseApp, teacherEmail, teacherPassword],
	)
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
			const attempt = async () => {
				const newTeacherData = await callCloudFunction<TeacherData>("getTeacherData", {})
				if (newTeacherData) {
					setTeacherData(newTeacherData)
					fetchLessonPlans()
				} else {
					setTeacherData(null)
				}
			}
			let attemptsRemaining = 4
			while (attemptsRemaining > 0) {
				try {
					await attempt()
					break
				} catch (e) {
					attemptsRemaining--
					if (attemptsRemaining === 0) {
						setCrudError((e as Error).toString())
					}
					await new Promise((resolve) => setTimeout(resolve, 1000))
					// setCrudError((e as Error).toString())
					// setTeacherData(null)
				}
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
						nickname: teacherInput.nickname ?? "",
						..._teacherData,
						...teacherInput,
					} as Teacher
					if (!isEqual(teacher, _teacherData)) {
						teacher.updated_at = new Date().toISOString()
						setTeacherData(
							(td) =>
								({
									...td,
									...teacher,
								}) as TeacherData,
						)
						await callCloudFunction("putTeacher", teacher)
					}
				} catch (e) {
					setCrudError((e as Error).toString())
					console.error(e)
				}
			}
		},
		[user, teacherData, callCloudFunction],
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
				teacherData.classes.reduce(
					(acc, s) => {
						acc[s.id] = s
						return acc
					},
					{} as Record<string, Class>,
				),
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
				const newClasses = [...(teacherData.classes ?? [])]
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
		[user, teacherData, callCloudFunction],
	)
	const editStudent = useCallback(
		async (id: string, studentInput: Student) => {
			if (user) {
				try {
					const cls = teacherData?.classes?.find((c) => c.id === studentInput.class_id)
					const oldStudent = cls?.students?.find((s) => s.id === id)
					if (teacherData && cls && oldStudent && !isEqual(oldStudent, studentInput)) {
						// Update our local state
						const newStudents = [...(cls.students ?? [])]
						newStudents[newStudents.findIndex((s) => s.id === id)] = studentInput
						const newClass: ClassWithStudents = { ...cls, students: newStudents }
						const newClasses = [...(teacherData.classes ?? [])]
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
		[user, teacherData, callCloudFunction],
	)
	const deleteStudent = useCallback(
		async (studentId: string, classId: string) => {
			if (teacherData && user) {
				const newStudentsCtrl = { ...studentsCtrl }
				delete newStudentsCtrl[studentId]
				setStudentsCtrl(newStudentsCtrl)
				setTeacherData(
					(td) =>
						({
							...td!,
							classes:
								td!.classes?.map((c) => ({
									...c,
									students: c.students?.filter((s) => s.id !== studentId) ?? [],
								})) ?? [],
						}) as TeacherData,
				)

				const studentHasResponses = teacherData?.lessons?.some((l) =>
					l.responses?.some((r) => r.student_id === studentId),
				)
				if (studentHasResponses) {
					window.alert("To delete this student, you must delete all responses associated with them first.")
					return
				}
				await callCloudFunction("deleteStudent", {
					id: studentId,
					class_id: classId,
				})
			}
		},
		[user, teacherData, studentsCtrl, callCloudFunction],
	)
	const createClass = useCallback(async () => {
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
	}, [user, callCloudFunction])
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
							const newClasses = [...(teacherData.classes ?? [])]
							newClasses[newClasses.findIndex((c) => c.id === newClassWithStudents.id)] =
								newClassWithStudents
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
		[user, teacherData, callCloudFunction],
	)
	const deleteClass = useCallback(
		async (classId: string) => {
			if (user) {
				const classHasLessons = teacherData?.lessons?.some((l) => l.class_id === classId)
				if (classHasLessons) {
					window.alert("To delete this class, you must delete all lessons associated with it first.")
					return
				}
				try {
					await callCloudFunction("deleteClass", { id: classId })
					fetchTeacherData()
				} catch (e) {
					setCrudError((e as Error).toString())
					console.error(e)
				}
			}
		},
		[user, fetchTeacherData, callCloudFunction],
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
							<p>Loading (please be patient)...</p>
						</div>
					</>
				) : user === null ? (
					<div className="page-content">
						{firstTimeUser ? (
							<section className="faint-bg">
								<div className="content-gutters">
									<h1>Create your teacher account</h1>
									<p>
										<button onClick={() => setFirstTimeUser(false)}>
											<span style={{ textDecoration: "underline" }}>I already have one</span>
										</button>
									</p>
									<div role="form" style={{ marginTop: "40px" }}>
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
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														createAccount()
													}
												}}
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
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														createAccount()
													}
												}}
											/>
										</div>

										<button
											className="large-button"
											type="submit"
											disabled={submittingSignUp}
											onClick={() => {
												createAccount()
											}}
										>
											{submittingSignUp ? (
												<span style={{ opacity: "0.5" }}>Creating Account...</span>
											) : (
												<span>Create Account</span>
											)}
										</button>
									</div>
								</div>
							</section>
						) : (
							<section className="faint-bg">
								<div className="content-gutters">
									<h1>Sign into your teacher account</h1>
									<p>
										<button onClick={() => setFirstTimeUser(true)}>
											<span style={{ textDecoration: "underline" }}>I don't have an account</span>
										</button>
									</p>
									<div role="form" style={{ marginTop: "40px" }}>
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
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														signIn().then(() => {
															fetchTeacherData()
														})
													}
												}}
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
												onKeyDown={(e) => {
													if (e.key === "Enter") {
														signIn().then(() => {
															fetchTeacherData()
														})
													}
												}}
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
								<p>Loading (please be patient)...</p>
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
								{teacherData && (
									<section className="faint-bg">
										<Lessons
											teacherData={teacherData}
											setTeacherData={setTeacherData}
											refreshTeacherData={fetchTeacherData}
										/>
									</section>
								)}

								{teacherData && (
									<section className="faint-bg">
										<LessonPlans
											teacherData={teacherData}
											setTeacherData={setTeacherData}
											refreshTeacherData={fetchTeacherData}
										/>
									</section>
								)}

								<section className="faint-bg">
									<div className="content-gutters">
										<h2 style={{ display: "flex", justifyContent: "space-between" }}>
											Classes and students
											<button onClick={() => createClass()}>+ Add a class</button>
										</h2>
									</div>
									<hr />
									<div className="content-gutters">
										{teacherData?.classes?.map(
											(c) =>
												classesCtrl[c.id] && (
													<div key={c.id}>
														<h3
															style={{
																display: "flex",
																justifyContent: "space-between",
																marginTop: "35px",
															}}
														>
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
															{c.name !== "Example Class" && (
																<button
																	onClick={() => {
																		if (
																			window.confirm(
																				`Are you sure you want to delete ${c.name}?`,
																			)
																		) {
																			deleteClass(c.id)
																		}
																	}}
																>
																	<FontAwesomeIcon icon={faTrashCan} />
																</button>
															)}
														</h3>
														<hr style={{ marginBottom: "5px" }} />
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
																				disabled={c.name === "Example Class"}
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
																						editStudent(
																							s.id,
																							studentsCtrl[s.id],
																						)
																					})
																				}}
																			/>
																			{c.name !== "Example Class" && (
																				<button
																					onClick={() => {
																						deleteStudent(s.id, c.id)
																					}}
																				>
																					<FontAwesomeIcon
																						icon={faTrashCan}
																					/>
																				</button>
																			)}
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
												),
										)}
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
