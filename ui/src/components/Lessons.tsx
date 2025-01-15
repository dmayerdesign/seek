import { faPlay } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { MD5 } from "crypto-js";
import { Dispatch, FC, SetStateAction, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { AppCtx, Class, LessonPlan, LessonWithResponses, TeacherData } from "../data-model";
import { parseISO } from "date-fns";

export interface LessonsProps {
    teacherData: TeacherData
    setTeacherData: Dispatch<SetStateAction<TeacherData|null|undefined>>
    refreshTeacherData: () => Promise<void>
}

const Lessons: FC<LessonsProps> = ({ teacherData, setTeacherData, refreshTeacherData }) => {
    const { user, callCloudFunction } = useContext(AppCtx)!
	const navigate = useNavigate()

    // Lessons CRUD
	const [lessonsCtrl, setLessonsCtrl] = useState<Record<string, LessonWithResponses>>({})
	useEffect(() => {
		if (teacherData && teacherData.lessons) {
			setLessonsCtrl(
				teacherData.lessons
					.sort((a, b) => a.created_at < b.created_at ? 1 : -1)
					.reduce(
						(acc, lp) => {
							if (!lp.deleted) acc[lp.id] = lp
							return acc
						},
						{} as Record<string, LessonWithResponses>,
					),
			)
		}
	}, [teacherData])
	const createLesson = useCallback(
		async (lesson_plan: LessonPlan, _class: Class) => {
			if (user) {
				const newLessonId = MD5(uuidv4()).toString().substring(0, 6).toUpperCase()
				const newLesson: LessonWithResponses = {
					id: newLessonId,
					lesson_name: `${lesson_plan.title} (for ${_class.name})`,
					class_id: _class.id,
					class_name: _class.name,
					lesson_plan_id: lesson_plan.id,
					lesson_plan_name: lesson_plan.title,
					teacher_email: user.email!,
					questions_locked: [],
					teacher_name: teacherData.nickname,
					created_at: new Date().toISOString(),
					updated_at: new Date().toISOString(),
				}
				// Update the database
				await callCloudFunction("putLesson", newLesson)
				// Lazily update our local state, because we are going to navigate to the
				// "new lesson" page, and we will re-fetch when we come back
				setTimeout(() => {
					setTeacherData(
						(td) =>
							({
								...td,
								lessons: [...(td?.lessons ?? []), newLesson],
							}) as TeacherData,
					)
				})
				return newLesson
			}
		},
		[user, callCloudFunction],
	)
	const [newLessonSelectedClassId, setNewLessonSelectedClassId] = useState<string>()
	const [newLessonSelectedPlanId, setNewLessonSelectedPlanId] = useState<string>()
	const newLessonSelectedClass = useMemo(
		() => teacherData?.classes?.find(c => c.id === newLessonSelectedClassId),
		[teacherData, newLessonSelectedClassId],
	)
	const newLessonSelectedPlan = useMemo(
		() => teacherData?.lesson_plans?.find(p => p.id === newLessonSelectedPlanId),
		[teacherData, newLessonSelectedPlanId],
	)

    return <>
		<div className="content-gutters">
			<h2>Begin a lesson</h2>
		</div>
        <div className="content-gutters">
			<div>
				<div style={{ display: "flex", gap: "20px", marginBottom: "15px" }}>

					<select id="begin-lesson-plan-select"
						className="inline-select"
						value={newLessonSelectedPlanId}
						onChange={(e) => setNewLessonSelectedPlanId(e.target.value)}
						style={{ maxWidth: "400px" }}>
						<option value={undefined}>Select a lesson plan</option>
						{teacherData?.lesson_plans?.map(p => (
							<option key={p.id} value={p.id}>{p.title}</option>
						))}
					</select>

					{newLessonSelectedPlan &&
					<select id="begin-lesson-class-select"
						className="inline-select"
						value={newLessonSelectedClassId}
						onChange={(e) => setNewLessonSelectedClassId(e.target.value)}
						style={{ maxWidth: "200px" }}>
						<option value="">Select a class</option>
						{teacherData?.classes?.map(c => (
							<option key={c.id} value={c.id}>{c.name}</option>
						))}
					</select>}

					{newLessonSelectedClass && newLessonSelectedPlan &&
					<button
						style={{ marginLeft: "20px" }}
						onClick={() => createLesson(newLessonSelectedPlan, newLessonSelectedClass)
							.then((_lesson) => {
								if (_lesson) {
									navigate("/for-teachers/lessons/" + _lesson.id)
								}
							})
							.catch((e) => console.error(e))
						}
					>
						<FontAwesomeIcon icon={faPlay} />&nbsp;
						Begin lesson
					</button>}
				</div>
			</div>
        </div>

		<hr />

		<div className="content-gutters">
			<h2>All lessons</h2>
			<hr />
			{teacherData?.lessons?.map((l) => lessonsCtrl[l.id] && (
				<div key={l.id}
					style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
					<h3 style={{ flexGrow: 1 }}>
						<a href={`/for-teachers/lessons/${l.id}`}>
							{lessonsCtrl[l.id].lesson_name}
						</a>
					</h3>
					<small>
						Created {parseISO(lessonsCtrl[l.id].created_at).toLocaleString()}
					</small>
				</div>
			))}
		</div>
    </>
}

export default Lessons
