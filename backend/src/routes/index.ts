import AuthRoutes from './auth.routes.js'
import ExerciseRoutes from './exercise.routes.js'
import LogRoutes from './log.routes.js'
import PlanRoutes from './plan.routes.js'
import SettingRoutes from './setting.routes.js'
import UserRoutes from './user.routes.js'
import WorkoutRoutes from './workout.routes.js'

const groupRoutes = [
  UserRoutes,
  AuthRoutes,
  PlanRoutes,
  WorkoutRoutes,
  ExerciseRoutes,
  LogRoutes,
  SettingRoutes
] as const

export default groupRoutes
