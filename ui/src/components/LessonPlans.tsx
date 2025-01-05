import { Dispatch, FC, SetStateAction, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { v4 as uuidv4 } from "uuid";
import { AppCtx, LessonPlanWithQuestions, LessonQuestion, TeacherData } from "../data-model";

export interface LessonPlansProps {
    teacherData: TeacherData
    setTeacherData: Dispatch<SetStateAction<TeacherData|null|undefined>>
    refreshTeacherData: () => Promise<void>
}

const LessonPlans: FC<LessonPlansProps> = ({ teacherData, setTeacherData, refreshTeacherData }) => {
    const { user, callCloudFunction, uploadFile } = useContext(AppCtx)!
	const navigate = useNavigate()

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
				// Then update the database
				await callCloudFunction("putLessonPlan", newLessonPlan)
				navigate(`/for-teachers/lesson-plans/${newLessonPlan.id}`)
				refreshTeacherData()
			}
		},
		[user, callCloudFunction],
	)

    return <>
		<div className="content-gutters">
			<h2 style={{ display: "flex", justifyContent: "space-between" }}>
				Lesson plans
				<button
					onClick={() => createLessonPlan()}
				>
					+ Add new lesson plan
				</button>
			</h2>
		</div>

		<hr />

		<div className="content-gutters">
			{teacherData?.lesson_plans?.map((lp) => lessonPlansCtrl[lp.id] && (
				<div key={lp.id}>
					<h3 style={{ display: "flex", justifyContent: "space-between" }}>
						<a href={`/for-teachers/lesson-plans/${lp.id}`}>
							{lessonPlansCtrl[lp.id].title}
						</a>
					</h3>
				</div>
			))}
		</div>
    </>
}

export default LessonPlans
