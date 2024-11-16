## Data model

- teacher (tenant)
    - classes
        - students
    - lesson_plans
        - questions
    - lessons
        - responses
        - analysis

## API model

Reads:

- getTeacherData (gets classes & students)
- getLessonPlans
- getLessons
- getLessonForStudent
- getLessonAnalysis (poll server side until lesson.analyzed = true, then respond)

Writes:

- putTeacher
- postClass
- postStudent
- deleteStudent
- putLessonPlan
- deleteLessonPlan
- putLessonQuestion
- deleteLessonQuestion
- postLesson (teacher: send the link)
- putLesson (teacher: lock answers -> init analysis)
- putLessonStudentSession (student: begins lesson)
- postLessonResponse (student: submits response)
- putLessonResponse (teacher: manually fix/edit student response)
- putLessonAnalysis (teacher: manually fix/edit LLM output)


