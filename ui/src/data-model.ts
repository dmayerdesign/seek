export interface Teacher {
	id: string
	nickname: string
	email_address: string
}

export interface TeacherData extends Teacher {
	classes: Class[]
	// lesson_plans: LessonPlan[]
	// lessons: Lesson[]
	// media_content: MediaContent[]
}

export interface Class {
	id: string
	teacher_email: string
	name: string
	students: Student[]
}

export interface Student {
	id: string
	nickname: string
	notes: string
}

export interface LessonPlan {
	id: string
	teacher_email: string
	title: string
	published: boolean
	questions: LessonQuestion[]
}

export interface LessonQuestion {
	id: string
	body_text: string
	field_of_study: string
	specific_topic: string
	media_content_ids?: string[]
	additional_context?: string
	final_response_categories?: string[]
	analysis?: LessonQuestionAnalysis
}

export interface LessonQuestionAnalysis {
	additional_context_summarized?: string
	suggested_response_categories?: string[]
}

export interface Lesson {
	id: string // Not a UUID like the others, rather a shorter string for use as a link
	lesson_plan_id: string
	class_id: string
	student_names: string[]
	teacher_name: string
	teacher_email: string
	responses_locked: boolean
	student_names_started?: string[]
	responses?: LessonResponse[]
	analyzing: boolean
}

export interface LessonResponse {
	id: string
	student_id: string
	student_name: string
	lesson_question_id: string
	response_image_base64?: string
	response_text?: string
	response_as_text?: string
	analysis?: LessonResponseAnalysis
}

export interface LessonResponseAnalysis {
	id: string
	question_id: string
	response_category: string
	response_category_explanation: string
	response_category_alternatives: string[]
}

export interface MediaContent {
	id: string // This matches the filename like "/mediaContent/{id}/some-file.png"
	deleted: boolean
}
