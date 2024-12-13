import { faTrash } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from "firebase/auth"
import { isEqual } from "lodash"
import { FC, useCallback, useContext, useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { AppCtx, Class, ClassWithStudents, LessonPlan, LessonPlanWithQuestions, LessonQuestion, Student, Teacher, TeacherData } from "../data-model"

const TeacherHome: FC = () => {
	const { user, firebaseApp, callCloudFunction } = useContext(AppCtx)!
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
	const fetchTeacherData = useCallback(async () => {
		if (user) {
			const newTeacherData = await callCloudFunction<TeacherData>("getTeacherData", {})
			if (newTeacherData) {
				setTeacherData(newTeacherData)
				fetchLessonPlans()
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
					console.error(e)
				}
			}
		},
		[user],
	)

	// Lesson plans CRUD
	const [lessonPlansCtrl, setLessonPlansCtrl] = useState<Record<string, LessonPlanWithQuestions>>({})
	const [lessonQuestionsCtrl, setLessonQuestionsCtrl] = useState<Record<string, LessonQuestion>>({})
	useEffect(() => {
		if (teacherData && teacherData.lesson_plans) {
			setLessonPlansCtrl(
				teacherData.lesson_plans.reduce(
					(acc, lp) => {
						acc[lp.id] = lp
						return acc
					},
					{} as Record<string, LessonPlanWithQuestions>,
				),
			)
			setLessonQuestionsCtrl(
				teacherData.lesson_plans
					.flatMap((lp) => lp.questions ?? [])
					.reduce(
						(acc, lq) => {
							acc[lq.id] = lq
							return acc
						},
						{} as Record<string, LessonQuestion>,
					)
			)
		}
	}, [teacherData])
	const createLessonPlan = useCallback(
		async () => {
			if (user) {
				const newLessonPlan: LessonPlanWithQuestions = {
					id: uuidv4(),
					teacher_email: user.email!,
					title: "New lesson plan",
					published: false,
					questions: [],
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				}
				// Update our local state
				setTeacherData(
					(td) =>
						({
							...td,
							lesson_plans: [...(td?.lesson_plans ?? []), newLessonPlan],
						}) as TeacherData,
				)
				// Then update the database
				await callCloudFunction("putLessonPlan", newLessonPlan)
			}
		},
		[user],
	)
	const editLessonPlan = useCallback(
		async (id: string, lessonPlanInput: LessonPlanWithQuestions) => {
			if (user) {
				try {
					const oldLessonPlan = teacherData?.lesson_plans.find((lp) => lp.id === id)
					if (teacherData && oldLessonPlan && !isEqual(oldLessonPlan, lessonPlanInput)) {
						// Update our local state
						const newLessonPlans = [...teacherData.lesson_plans]
						newLessonPlans[newLessonPlans.findIndex((lp) => lp.id === id)] = lessonPlanInput
						setTeacherData(
							(td) =>
								({
									...td,
									lesson_plans: newLessonPlans,
								}) as TeacherData,
						)
						// Then update the database
						await callCloudFunction("putLessonPlan", {
							...lessonPlanInput,
							updated_at: new Date().toISOString(),
						})
						// fetchTeacherData()
					}
				} catch (e) {
					console.error(e)
				}
			}
		},
		[user, teacherData],
	)
	const deleteLessonPlan = useCallback(
		async (lessonPlanId: string) => {
			if (user) {
				try {
					await callCloudFunction("deleteLessonPlan", { id: lessonPlanId })
					fetchTeacherData()
				} catch (e) {
					console.error(e)
				}
			}
		},
		[user],
	)
	const createLessonQuestion = useCallback(
		async (lessonPlan: LessonPlanWithQuestions) => {
			if (user && teacherData) {
				const newLessonQuestion: LessonQuestion = {
					id: uuidv4(),
					lesson_plan_id: lessonPlan.id,
					teacher_email: user.email!,
					body_text: "New question",
					field_of_study: "",
					specific_topic: "",
					media_content_urls: [],
					additional_context: "",
					final_response_categories: [],
					analysis: undefined,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				}
				// Update our local state
				const newQuestions = [...(lessonPlan.questions ?? []), newLessonQuestion]
				const newLessonPlan: LessonPlanWithQuestions = {
					...lessonPlan,
					questions: newQuestions,
				}
				const newLessonPlans = [...teacherData.lesson_plans]
				newLessonPlans[newLessonPlans.findIndex((lp) => lp.id === lessonPlan.id)] = newLessonPlan
				setTeacherData(
					(td) =>
						({
							...td,
							lesson_plans: newLessonPlans,
						}) as TeacherData,
				)
				// Then update the database
				await callCloudFunction("putLessonQuestion", newLessonQuestion)
			}
		},
		[user, teacherData],
	)
	const editLessonQuestion = useCallback(
		async (id: string, lessonQuestionInput: LessonQuestion) => {
			if (user) {
				try {
					const oldLessonQuestion = teacherData?.lesson_plans
						.flatMap((lp) => lp.questions ?? [])
						.find((lq) => lq.id === id)
					if (teacherData && oldLessonQuestion && !isEqual(oldLessonQuestion, lessonQuestionInput)) {
						// Update our local state
						const newQuestions = teacherData.lesson_plans
							.flatMap((lp) => lp.questions ?? [])
							.map((lq) => (lq.id === id ? lessonQuestionInput : lq))
						const newLessonPlans = teacherData.lesson_plans.map((lp) => ({
							...lp,
							questions: newQuestions.filter((lq) => lq.id === lp.id),
						}))
						setTeacherData(
							(td) =>
								({
									...td,
									lesson_plans: newLessonPlans,
								}) as TeacherData,
						)
						// Then update the database
						await callCloudFunction("putLessonQuestion", {
							...lessonQuestionInput,
							updated_at: new Date().toISOString(),
						})
						// fetchTeacherData()
					}
				} catch (e) {
					console.error(e)
				}
			}
		},
		[user, teacherData],
	)
	const deleteLessonQuestion = useCallback(
		async (lessonQuestionId: string) => {
			if (user) {
				try {
					await callCloudFunction("deleteLessonQuestion", { id: lessonQuestionId })
					fetchTeacherData()
				} catch (e) {
					console.error(e)
				}
			}
		},
		[user],
	)

	return (
		<div className="light">
			<div className="seek-page">
				{user === undefined ? (
					<>
						<div className="page-content">
							<p>Loading...</p>
						</div>
					</>
				) : user === null ? (
					<div className="page-content">
						{firstTimeUser ? (
							<section>
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
							</section>
						) : (
							<section>
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
							</section>
						)}
					</div>
				) : (
					<div className="page-content">
						<section>
							<h2>Set up your profile</h2>

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
						</section>

						{!teacherData ? (
							<>
								<p>Loading...</p>
							</>
						) : (
							<>
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
										<button
											onClick={() => createLessonPlan()}
										>
											+ Add new lesson plan
										</button>
									</h2>

									{teacherData.lesson_plans?.map((lp) => lessonPlansCtrl[lp.id] && (
										<div key={lp.id}>
											<h3 style={{ display: "flex", justifyContent: "space-between" }}>
												<input
													className="inline-input"
													style={{ flexGrow: 1 }}
													value={lessonPlansCtrl[lp.id].title}
													onChange={(e) => {
														setLessonPlansCtrl((lpc) => ({
															...lpc,
															[lp.id]: {
																...lpc[lp.id],
																title: e.target.value,
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
															editLessonPlan(lp.id, lessonPlansCtrl[lp.id])
														})
													}}
												/>
												<button
													onClick={() => {
														if (window.confirm(`Are you sure you want to delete ${lp.title}?`)) {
															deleteLessonPlan(lp.id)
														}
													}}
												>
													<FontAwesomeIcon icon={faTrash} />
												</button>
											</h3>
											<hr />
											<ul>
												{lp.questions?.map(
													(q) =>
														lessonQuestionsCtrl[q.id] && (
															<li key={q.id}>
																<h4>{q.body_text}</h4>
															</li>
														),
												)}
											</ul>
											<div style={{ marginTop: "20px", marginLeft: "20px" }}>
												<button
													onClick={() => {
														createLessonQuestion(lp)
														// setTimeout(() => {
														// 	const newInput = document.querySelector("ul:last-child li:last-child h4") as HTMLHeadingElement
														// 	console.log("got new input?", newInput)
														// 	newInput?.focus()
														// 	setTimeout(() => {
														// 		newInput?.select()
														// 	})
														// }, 100)
													}}
												>
													+ Add a question
												</button>
											</div>
										</div>
									))}
								</section>

								<section>
									<h2 style={{ display: "flex", justifyContent: "space-between" }}>
										Classes and students
										<button
											onClick={() => createClass()}
										>
											+ Add a class
										</button>
									</h2>

									{teacherData.classes?.map((c) => classesCtrl[c.id] && (
										<div key={c.id}>
											<h3 style={{ display: "flex", justifyContent: "space-between" }}>
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
													<FontAwesomeIcon icon={faTrash} />
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
																	<FontAwesomeIcon icon={faTrash} />
																</button>
															</li>
														),
												)}
											</ul>
											<div style={{ marginTop: "20px", marginLeft: "20px" }}>
												<button
													onClick={() => {
														createStudent(c)
														setTimeout(() => {
															const newInput = document.querySelector(
																"#students li:last-child input",
															) as HTMLInputElement
															console.log("got new input?", newInput)
															newInput?.focus()
															setTimeout(() => {
																newInput?.select()
															})
														}, 100)
													}}
												>
													+ Add a student
												</button>
											</div>
										</div>
									))}
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
