import { FC, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import CanvasInput from "../components/CanvasInput"
import { AppCtx, Lesson, Student } from "../data-model"
import { useParams } from "react-router-dom"

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

	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [studentUser, setStudentUser] = useState<string>()
	const [typedInput, setTypedInput] = useState("")
	const submit = useCallback(() => {
		console.log("canvas?", canvasRef.current)
		if (canvasRef.current) {
			const dataURL = canvasRef.current.toDataURL()
			console.log(dataURL)
		}
	}, [canvasRef.current])

	return (
		<div className="dark">
			<header>
				<div className="page-content">
					<img
						src="/seek-logo-light.png"
						className="seek-logo"
						style={{ height: "18px", width: "auto" }}
						alt="SEEK"
					/>
				</div>
			</header>
			{!lesson
				? <div className="seek-page">
					<div className="page-content">
						<p>Loading...</p>
					</div>
				</div>
				: <>
					<div className="seek-page">
						<div className="page-content">
							{!studentUser && (
								<section>
									<p>Welcome! What is your name?</p>
									<select
										className="large-select"
										style={{ width: "100%" }}
										value={studentUser}
										onChange={(e) => setStudentUser(e.target.value)}
									>
										<option key={""} value={undefined}>
											{"Select from this list"}
										</option>
										{}
									</select>
								</section>
							)}
							{studentUser && (
								<section>
									<div style={{ maxWidth: "600px", marginTop: "25px" }}>
										<textarea
											id="typed-input"
											name="typed-input"
											className="large-input"
											placeholder="Type your response here..."
											value={typedInput}
											onInput={(e) => setTypedInput((e.target as HTMLInputElement).value)}
											style={{ width: "100%", height: "100px" }}
										/>
									</div>
									<div>
										<p>Or draw your response below</p>
										<div style={{ maxWidth: "600px" }}>
											<CanvasInput canvasRef={canvasRef} />
										</div>
									</div>
									<div style={{ maxWidth: "600px", marginTop: "25px" }}>
										<button className="large-button" onClick={submit}>
											Submit
										</button>
									</div>
								</section>
							)}
						</div>
					</div>
				</>}
		</div>
	)
}

export default AppForStudents
