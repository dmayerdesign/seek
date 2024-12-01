import { FC, useCallback, useEffect, useMemo, useRef, useState } from "react"
import CanvasInput from "../components/CanvasInput"
import { Lesson, Student } from "../data-model"

const AppForStudents: FC = () => {
	const canvasRef = useRef<HTMLCanvasElement>(null)
	const [theLesson, setTheLesson] = useState<Lesson>({
		id: "test",
		lesson_plan_id: "test",
		class_id: "test",
		student_names: [
			"Alice",
			"Bobby",
			"Danny",
			"Esha",
		],
		teacher_name: "Test Teacher",
		teacher_email: "test.teacher@school.com",
		responses_locked: false,
		student_names_started: [],
	})
	const studentDropdownOptions = useMemo(() => theLesson.student_names, [theLesson])
	const [studentUser, setStudentUser] = useState<string>()
	const [typedInput, setTypedInput] = useState("")
	const submit = useCallback(() => {
		console.log("canvas?", canvasRef.current)
		if (canvasRef.current) {
			const dataURL = canvasRef.current.toDataURL()
			console.log(dataURL)
		}
	}, [canvasRef.current])

	useEffect(() => {

	}, [theLesson])

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
			<div className="seek-page">
				<div className="page-content">
					{!studentUser && <section>
						<p>Welcome! What is your name?</p>
						<select
							className="large-select"
							style={{ width: "100%" }}
							value={studentUser}
							onChange={(e) => setStudentUser(e.target.value)}
						>
							<option key={""} value={undefined}>{"Select from this list"}</option>
							{
								theLesson.student_names.map((studentName) => (
									<option key={studentName} value={studentName}>{studentName}</option>
								))
							}</select>
					</section>}
					{studentUser && <section>
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
							<button className="large-button" onClick={submit}>Submit</button>
						</div>
					</section>}
				</div>
			</div>
		</div>
	)
}

export default AppForStudents
