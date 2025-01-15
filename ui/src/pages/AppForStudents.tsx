import { FC, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { AppCtx, Lesson, LessonResponse, LessonWithResponses, Student } from "../data-model"
import { useParams } from "react-router-dom"
import LessonQuestionForStudent from "./LessonQuestionForStudent"

const AppForStudents: FC = () => {
	const { callCloudFunction } = useContext(AppCtx)!
	const [lesson, setLesson] = useState<Lesson>()
	const { teacherEmail, lessonId } = useParams()
	useEffect(() => {
		if (lessonId && !lesson) {
			callCloudFunction<Lesson>("getLesson", {
				id: lessonId,
				teacher_email: decodeURIComponent(teacherEmail ?? ""),
			}).then((lesson) => {
				if (lesson) {
					setLesson(lesson)
				}
			})
		}
	}, [lessonId])
	const [studentUser, setStudentUser] = useState<string>()
	const student = useMemo(() => {
		if (lesson && lesson.lesson_plan && lesson.class_data?.students) {
			return lesson.class_data.students.find((student) => student.nickname === studentUser)
		}
	}, [lesson, studentUser])
	// Display the browser default "Reload this page?" dialog if the student tries to reload or close the tab
	useEffect(() => {
		window.addEventListener("beforeunload", (e) => {
			e.preventDefault()
		})
	}, [])
	const submitResponse = useCallback(async (response: LessonResponse) => {
		callCloudFunction("putLessonResponse", response)
	}, [lessonId])
	const questionsToShow = useMemo(() => {
		// Show questions starting at the first un-analyzed one
		const l = lesson as LessonWithResponses
		if (l?.lesson_plan) {
			const idxOfFirstUnansweredQuestion = l.lesson_plan.questions.findIndex(
				(q) => !l.responses?.find((r) => r.question_id === q.id),
			)
			if (idxOfFirstUnansweredQuestion >= 0) {
				return l.lesson_plan.questions.slice(0, idxOfFirstUnansweredQuestion + 1)
			}
		}
		return lesson?.lesson_plan?.questions ?? []
	}, [lesson, lesson?.lesson_plan])

	return (
		<div className="dark">
			<header>
				<div className="page-content">
				<div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<img
						src="/seek-logo-light.png"
						className="seek-logo"
						style={{ height: "18px", width: "auto", textShadow: "none" }}
						alt="SEEK"
					/>
					{studentUser && <>
						Hello, {studentUser}!
					</>}
				</div>
			</div>
			</header>
			{!lesson
				? <div className="seek-page">
					<div className="page-content">
						<p>Loading (please be patient)...</p>
					</div>
				</div>
				: <>
					<div className="seek-page">
						<div className="page-content">
							{!studentUser && (
								<section>
									<p>Welcome! What is your name?</p>
									<select
										className="inline-select"
										style={{ width: "100%" }}
										value={studentUser}
										onChange={(e) => {
											setStudentUser(e.target.value)
											if (!lesson.student_names_started?.includes(e.target.value)) {
												callCloudFunction("postStudentNameStarted", {
													student_name: e.target.value,
													teacher_email: lesson.teacher_email,
													lesson_id: lesson.id,
												})
											}
										}}
									>
										<option key={""} value={undefined}>
											{"Select from this list"}
										</option>
										{lesson.class_data?.students?.map((student: Student) => (
											<option key={student.id} value={student.nickname}>
												{student.nickname}
											</option>
										))}
									</select>
								</section>
							)}
							{student && <>
								<section style={{ padding: "0" }}>
									<h1>{lesson.lesson_plan_name}</h1>
									<p>Teacher: {lesson.teacher_name}</p>
									<p>Class: {lesson.class_name}</p>
								</section>
								{questionsToShow.map((question) => (
									<section key={question.id} style={{ padding: "0" }}>
										<LessonQuestionForStudent
											lesson={lesson}
											question={question}
											student={student}
											submitResponse={submitResponse}
										/>
									</section>
								))}
							</>}
						</div>
					</div>
				</>}
		</div>
	)
}

export default AppForStudents
