import { FirebaseApp } from "firebase/app"
import { User } from "firebase/auth"
import { createContext } from "react"

export interface Teacher {
	id: string
	user_id: string
	nickname: string
	email_address: string
	created_at: string
	updated_at: string
}

export interface TeacherData extends Teacher {
	classes?: ClassWithStudents[]
	lesson_plans?: LessonPlanWithQuestions[]
	lessons?: LessonWithResponses[]
}

export interface Class {
	id: string
	teacher_email: string
	name: string
	created_at: string
	updated_at: string
}
export interface ClassWithStudents extends Class {
	students: Student[]
}

export interface Student {
	id: string
	class_id: string
	teacher_email: string
	nickname: string
	notes: string
	created_at: string
	updated_at: string
}

export interface LessonPlan {
	id: string
	teacher_email: string
	title: string
	published: boolean
	created_at: string
	updated_at: string
}
export interface LessonPlanWithQuestions extends LessonPlan {
	questions: LessonQuestion[]
}

export interface LessonQuestion {
	id: string
	lesson_plan_id: string
	teacher_email: string
	body_text: string
	created_at: string
	updated_at: string
	// field_of_study: string
	// specific_topic: string
	categorization_guidance?: string
	media_content_urls?: string[]
	context_material_urls?: string[]
}

export interface Lesson {
	id: string // Not a UUID like the others, rather a shorter string for use as a link
	lesson_name: string
	lesson_plan_id: string
	lesson_plan_name: string
	class_id: string
	class_name: string
	teacher_name: string
	teacher_email: string
	responses_locked: boolean
	created_at: string
	updated_at: string
	deleted?: boolean
	student_names_started?: string[]
	class_data?: ClassWithStudents
	lesson_plan?: LessonPlanWithQuestions
	analysis_by_question_id?: Record<string, LessonQuestionAnalysis>
}

export interface LessonQuestionAnalysis {
	question_id: string
	responses_by_category: Record<string, LessonResponse[]>
}

export interface LessonWithResponses extends Lesson {
	responses?: LessonResponse[]
}

export interface LessonResponse {
	id: string
	teacher_email: string
	question_id: string
	lesson_id: string
	student_id: string
	student_name: string
	response_image_base64?: string
	response_text?: string
	analysis?: LessonResponseAnalysis
	created_at: string
	updated_at: string
}

export interface LessonResponseAnalysis {
	response_summary: string
}

/**
 * UI-only data model
 */
export const AppCtx = createContext<AppContext | null>(null)
export interface AppContext {
	firebaseApp: FirebaseApp
	user: User | null | undefined
	callCloudFunction: <ReturnType = void>(endpoint: string, data?: any, authorization?: string) => Promise<ReturnType | null>
	uploadFile: (file: File, destFolder: string) => Promise<string>
}
