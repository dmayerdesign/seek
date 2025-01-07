import { Dispatch, FC, SetStateAction, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppCtx, LessonPlanWithQuestions, LessonQuestion, TeacherData } from "../data-model";
import { v4 as uuidv4 } from "uuid"
import { isEqual } from "lodash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileImage, faImages, faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { faChevronLeft, faMagicWandSparkles, faUpload } from "@fortawesome/free-solid-svg-icons";

export interface LessonPlanProps {}

const LessonPlan: FC<LessonPlanProps> = ({}) => {
    // Global state
	const { user, callCloudFunction, uploadFile } = useContext(AppCtx)!
	const navigate = useNavigate()
	
	// Fetch teacher data
	const [teacherData, setTeacherData] = useState<TeacherData|null>()
	const [crudError, setCrudError] = useState<string>()
	const fetchTeacherData = useCallback(async () => {
		if (user) {
			setTeacherData(undefined)
			try {
				const newTeacherData = await callCloudFunction<TeacherData>("getTeacherData", {})
				if (newTeacherData) {
					setTeacherData(newTeacherData)
				} else {
					setTeacherData(null)
				}
			} catch (e) {
				setCrudError((e as Error).toString())
				setTeacherData(null)
			}
		}
	}, [user, callCloudFunction])
	useEffect(() => {
		fetchTeacherData()
	}, [fetchTeacherData])

	// Fetch lesson and lesson plan
	const { id: lessonPlanId } = useParams()
	const [lessonPlan, setLessonPlan] = useState<LessonPlanWithQuestions>()
	useEffect(() => {
		if (teacherData && lessonPlanId && !lessonPlan) {
			callCloudFunction<LessonPlanWithQuestions[]>("getLessonPlans", {}).then((_lessonPlans) => {
				setLessonPlan(_lessonPlans?.find(l => l.id === lessonPlanId))
			})
		}
	}, [lessonPlanId, teacherData])

    // Lesson plans CRUD
	const [lessonPlanCtrl, setLessonPlanCtrl] = useState<LessonPlanWithQuestions>()
	const [lessonQuestionsCtrl, setLessonQuestionsCtrl] = useState<Record<string, LessonQuestion>>({})
	useEffect(() => {
		if (lessonPlan) {
			setLessonPlanCtrl({ ...lessonPlan })
			setLessonQuestionsCtrl(
				lessonPlan.questions?.reduce(
					(acc, lq) => {
						acc[lq.id] = lq
						return acc
					},
					{} as Record<string, LessonQuestion>,
				)
				?? {}
			)
		}
	}, [lessonPlan])
	const editLessonPlan = useCallback(
		async (id: string, lessonPlanInput: LessonPlanWithQuestions) => {
			if (user) {
				try {
					const oldLessonPlan = teacherData?.lesson_plans?.find((lp) => lp.id === id)
					if (teacherData && oldLessonPlan && !isEqual(oldLessonPlan, lessonPlanInput)) {
						// Update our local state
						const newLessonPlans = [...(teacherData.lesson_plans ?? [])]
						newLessonPlans[newLessonPlans.findIndex((lp) => lp.id === id)] = {
							...lessonPlanInput
						}
						setLessonPlan(newLessonPlans.find((lp) => lp.id === id))
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
					}
				} catch (e) {
					console.error(e)
				}
			}
		},
		[user, teacherData, callCloudFunction],
	)
	const deleteLessonPlan = useCallback(
		async (lessonPlanId: string) => {
			if (user) {
				try {
					callCloudFunction("deleteLessonPlan", { id: lessonPlanId }).then(() => {
						navigate("/")
					})
				} catch (e) {
					console.error(e)
				}
			}
		},
		[user, callCloudFunction],
	)
	const createLessonQuestion = useCallback(
		async (lessonPlan: LessonPlanWithQuestions) => {
			if (user && teacherData) {
				const newLessonQuestion: LessonQuestion = {
					id: uuidv4(),
					lesson_plan_id: lessonPlan.id,
					teacher_email: user.email!,
					body_text: "New question",
					media_content_urls: [],
					context_material_urls: [],
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				}
				// Update our local state
				const newQuestions = [...(lessonPlan.questions ?? []), newLessonQuestion]
				const newLessonPlan: LessonPlanWithQuestions = {
					...lessonPlan,
					questions: newQuestions,
				}
				const newLessonPlans = [...(teacherData.lesson_plans ?? [])]
				newLessonPlans[newLessonPlans.findIndex((lp) => lp.id === lessonPlan.id)] = newLessonPlan
				setLessonPlan(newLessonPlan)
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
		[user, teacherData, callCloudFunction],
	)
	const editLessonQuestion = useCallback(
		async (lessonPlanId: string, lessonQuestionId: string, lessonQuestionInput: LessonQuestion) => {
			if (user) {
				try {
					const oldLessonQuestion = teacherData?.lesson_plans
						?.filter(lp => lp.id === lessonPlanId)
						.flatMap((lp) => lp.questions ?? [])
						.find((lq) => lq.id === lessonQuestionId)
					if (teacherData && oldLessonQuestion && !isEqual(oldLessonQuestion, lessonQuestionInput)) {
						// Update our local state
						const newLessonPlans = teacherData.lesson_plans?.map((lp) => lp.id == lessonPlanId ? ({
							...lp,
							questions: lp.questions
								.map((lq) => (lq.id === lessonQuestionId
									? {
										...lq,
										...lessonQuestionInput,
										media_content_urls: [
											...(lessonQuestionInput.media_content_urls ?? []),
										],
										context_material_urls: [
											...(lessonQuestionInput.context_material_urls ?? []),
										],
									}
									: lq)),
						}) : lp)
						setLessonPlan(newLessonPlans?.find((lp) => lp.id === lessonPlanId))
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
							id: lessonQuestionId,
							lesson_plan_id: lessonPlanId,
							updated_at: new Date().toISOString(),
						})
					}
				} catch (e) {
					console.error(e)
				}
			}
		},
		[user, teacherData, callCloudFunction],
	)
	const deleteLessonQuestion = useCallback(
		async (lessonPlanId: string, lessonQuestionId: string) => {
			if (user) {
				try {
					const oldLessonQuestion = teacherData?.lesson_plans
						?.filter(lp => lp.id === lessonPlanId)
						.flatMap((lp) => lp.questions ?? [])
						.find((lq) => lq.id === lessonQuestionId)
					if (teacherData && oldLessonQuestion) {
						// Update our local state
						const newLessonPlans = teacherData.lesson_plans?.map((lp) => lp.id == lessonPlanId ? ({
							...lp,
							questions: lp.questions.filter((lq) => lq.id !== lessonQuestionId),
						}) : lp)
						const newLessonPlan = newLessonPlans?.find((lp) => lp.id === lessonPlanId)
						setLessonPlan(newLessonPlan)
						setTeacherData(
							(td) =>
								({
									...td,
									lesson_plans: newLessonPlans,
								}) as TeacherData,
						)
						// Then update the database
						await callCloudFunction("deleteLessonQuestion", {
							id: lessonQuestionId,
							lesson_plan_id: lessonPlanId,
						})
					}
				} catch (e) {
					console.error(e)
				}
			}
		},
		[user, teacherData, callCloudFunction],
	)

    return <div className="light">
		<div className="seek-page">
			<div className="page-content">{!lessonPlan || !lessonPlanCtrl || !teacherData
				? <div>
					<p>Loading...</p>
				</div>
				: <div>
					<section className="faint-bg">
						<div className="content-gutters">
							<div style={{ margin: "20px 0" }}>
								<button onClick={() => history.back()}>
									<FontAwesomeIcon icon={faChevronLeft} />&nbsp;
									Back
								</button>
							</div>
							<div key={lessonPlan.id}>
								<h2 style={{ display: "flex", justifyContent: "space-between", marginTop: "40px" }}>
									<input
										className="inline-input"
										style={{ flexGrow: 1 }}
										value={lessonPlanCtrl.title}
										onChange={(e) => {
											setLessonPlanCtrl((lpc) => ({
												...lpc,
												title: e.target.value,
											}) as LessonPlanWithQuestions)
										}}
										onKeyDown={(e) => {
											if (e.key === "Enter") {
												e.currentTarget.blur()
											}
										}}
										onBlur={() => {
											setTimeout(() => {
												editLessonPlan(lessonPlan.id, lessonPlanCtrl)
											})
										}}
									/>
									<button
										onClick={() => {
											if (window.confirm(`Are you sure you want to delete ${lessonPlan.title}?`)) {
												deleteLessonPlan(lessonPlan.id)
											}
										}}
									>
										<FontAwesomeIcon icon={faTrashCan} />
									</button>
								</h2>
								<ul id="lesson-plan-questions">
									{Object.values(lessonQuestionsCtrl)?.map(
										(q) =>
											lessonQuestionsCtrl[q.id] && (
												<li key={q.id}
													style={{ padding: "0", marginTop: "30px", marginBottom: "50px" }}>
													
													<hr style={{ marginBottom: "30px" }} />

													<h4 style={{
														display: "flex",
														justifyContent: "space-between",
														marginTop: "15px",
														marginBottom: "0px",
													}}>
														<textarea
															placeholder="Enter your question here"
															className="inline-input"
															style={{ flexGrow: 1, minHeight: "3em" }}
															value={lessonQuestionsCtrl[q.id].body_text}
															onChange={(e) => {
																setLessonQuestionsCtrl((lqc) => ({
																	...lqc,
																	[q.id]: {
																		...lqc[q.id],
																		body_text: e.target.value,
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
																	editLessonQuestion(lessonPlan.id, q.id, lessonQuestionsCtrl[q.id])
																})
															}}
														/>
														<button
															onClick={() => {
																if (window.confirm(`Are you sure you want to delete this question?`)) {
																	deleteLessonQuestion(lessonPlan.id, q.id)
																}
															}}
														>
															<FontAwesomeIcon icon={faTrashCan} />
														</button>
													</h4>
													<br />
													<div>
														<p>
															If you want, enter below one or more categories of response
															that you expect to see, separated by commas or new lines.
														</p>
														<br />
														<textarea
															placeholder={"Enter the expected response categories here. "+
																"With each category, please include a short paragraph that describes it."}
															className="inline-input"
															style={{ width: "100%" }}
															value={lessonQuestionsCtrl[q.id].categorization_guidance}
															onChange={(e) => {
																setLessonQuestionsCtrl((lqc) => ({
																	...lqc,
																	[q.id]: {
																		...lqc[q.id],
																		categorization_guidance: e.target.value,
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
																	editLessonQuestion(lessonPlan.id, q.id, lessonQuestionsCtrl[q.id])
																})
															}}
														/>
													</div>
													<br />
													<div style={{ marginLeft: "25px" }}>
														<div>
															<div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
																<div style={{ flexGrow: 1 }}>
																	<h5 style={{ marginBottom: "15px", display: "flex", alignItems: "center" }}>
																		<FontAwesomeIcon icon={faImages} />&nbsp;
																		Image(s) to display with the question
																	</h5>
																	<ul className="file-list">
																		{q.media_content_urls?.map((url) => {
																			const decodedUrl = decodeURIComponent(url)
																			return <li key={decodedUrl}
																				style={{
																					display: "flex",
																					alignItems: "center",
																					justifyContent: "space-between",
																					padding: "0",
																					gap: "20px",
																				}}>
																				<div>
																					{decodedUrl.split("/").pop()?.split("?")[0].match(/\.(jpg|jpeg|png|gif)$/gi)
																						? <img key={decodedUrl} src={url} style={{
																							width: "100%",
																							maxWidth: "400px",
																						}} />
																						: <a key={decodedUrl} href={decodedUrl} target="_blank" rel="noreferrer">
																							{decodedUrl.split("/").pop()?.split("?")[0]}
																						</a>
																					}
																				</div>
																				<button
																					onClick={() => {
																						editLessonQuestion(lessonPlan.id, q.id, {
																							...lessonQuestionsCtrl[q.id],
																							media_content_urls: lessonQuestionsCtrl[q.id].media_content_urls?.filter((u) => u !== url),
																						})
																					}}
																				>
																					<FontAwesomeIcon icon={faTrashCan} />
																				</button>
																			</li>
																		})}
																	</ul>
																</div>
																<div style={{ flexGrow: 0, flexBasis: "200px", minWidth: "200px", marginTop: "15px" }}>
																	<label className="file-input-group">
																		<FontAwesomeIcon icon={faUpload} />
																		&nbsp;
																		Upload
																		<input type="file"
																			accept=".jpg,.jpeg,.png"
																			style={{ opacity: 0, position: "absolute", left: 0, pointerEvents: "none" }}
																			onChange={(e) => {
																				const input = e.target as HTMLInputElement
																				if (input.files && input.files.length > 0) {
																					const file = input.files[0]
																					input.value = ""
																					uploadFile(file, `${teacherData.id}/media-for-questions`).then((url) => {
																						const newLessonQuestion: LessonQuestion = {
																							...lessonQuestionsCtrl[q.id],
																							media_content_urls: [
																								...(lessonQuestionsCtrl[q.id].media_content_urls ?? []),
																								url,
																							],
																						}
																						setLessonQuestionsCtrl((lqc) => ({
																							...lqc,
																							[q.id]: newLessonQuestion,
																						}))
																						setTimeout(() => {
																							editLessonQuestion(lessonPlan.id, q.id, newLessonQuestion)
																						}, 100)
																					})
																				}
																			}}
																		/>
																	</label>
																	<p style={{ margin: "10px" }}>
																		<small>Use JPEG or PNG files for the best results</small>
																	</p>
																</div>
															</div>
														</div>
														<br />
														<div>
															<div style={{ display: "flex", justifyContent: "space-between", gap: "20px" }}>
																<div style={{ flexGrow: 1 }}>
																	<h5 style={{ marginBottom: "15px", display: "flex", alignItems: "center" }}>
																		<FontAwesomeIcon icon={faMagicWandSparkles} />&nbsp;
																		Materials to help the model&rsquo;s analysis
																	</h5>
																	<ul className="file-list">
																		{q.context_material_urls?.map((url) => {
																			const decodedUrl = decodeURIComponent(url)
																			return <li key={url}
																				style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0" }}>
																				{decodedUrl.match(/\.(jpg|jpeg|png|gif)$/gi)
																					? <img key={decodedUrl} src={url} style={{ width: "100px", maxHeight: "100px" }} />
																					: <a key={decodedUrl} href={url} target="_blank" rel="noreferrer">
																						{decodedUrl.split("/").pop()?.split("?")[0]}
																					</a>
																				}
																				<button
																					onClick={() => {
																						editLessonQuestion(lessonPlan.id, q.id, {
																							...lessonQuestionsCtrl[q.id],
																							context_material_urls: lessonQuestionsCtrl[q.id].context_material_urls?.filter((u) => u !== url),
																						})
																					}}
																				>
																					<FontAwesomeIcon icon={faTrashCan} />
																				</button>
																			</li>
																		})}
																	</ul>
																</div>
																<div style={{ flexGrow: 0, flexBasis: "200px", minWidth: "200px", marginTop: "15px" }}>
																	<label className="file-input-group">
																		<FontAwesomeIcon icon={faUpload} />
																		&nbsp;
																		Upload
																		<input type="file"
																			accept=".pdf,.jpg,.jpeg,.png"
																			style={{ opacity: 0, position: "absolute", left: 0, pointerEvents: "none" }}
																			onChange={(e) => {
																				const input = e.target as HTMLInputElement
																				if (input.files && input.files.length > 0) {
																					const file = input.files[0]
																					input.value = ""
																					uploadFile(file, `${teacherData.id}/context-materials`).then((url) => {
																						const newLessonQuestion: LessonQuestion = {
																							...lessonQuestionsCtrl[q.id],
																							context_material_urls: [
																								...(lessonQuestionsCtrl[q.id].context_material_urls ?? []),
																								url,
																							],
																						}
																						setLessonQuestionsCtrl((lqc) => ({
																							...lqc,
																							[q.id]: newLessonQuestion,
																						}))
																						setTimeout(() => {
																							editLessonQuestion(lessonPlan.id, q.id, newLessonQuestion)
																						}, 100)
																					})
																				}
																			}}
																		/>
																	</label>
																	<p style={{ margin: "10px" }}>
																		<small>Must be a PDF or image file, smaller than 5 MB</small>
																	</p>
																</div>
															</div>
														</div>
													</div>
												</li>
											),
									)}
								</ul>
								<div style={{ marginTop: "20px", marginLeft: "20px" }}>
									<button
										onClick={() => {
											createLessonQuestion(lessonPlan)
										}}
									>
										+ Add a question
									</button>
								</div>
							</div>
						</div>
					</section>
				</div>
			}</div>
		</div>
	</div>
}

export default LessonPlan
