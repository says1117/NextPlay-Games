import axios from 'axios'
import { supabase } from './supabase'
import type { Task, Member, Label, Comment, ActivityLog } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
})

api.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Tasks
export const getTasks = () => api.get<Task[]>('/api/tasks').then(r => r.data)
export const getTask = (id: string) => api.get<Task>(`/api/tasks/${id}`).then(r => r.data)
export const createTask = (data: Partial<Task>) => api.post<Task>('/api/tasks', data).then(r => r.data)
export const updateTask = (id: string, data: Partial<Task>) => api.put<Task>(`/api/tasks/${id}`, data).then(r => r.data)
export const deleteTask = (id: string) => api.delete(`/api/tasks/${id}`)

// Comments
export const getComments = (taskId: string) => api.get<Comment[]>(`/api/tasks/${taskId}/comments`).then(r => r.data)
export const createComment = (taskId: string, content: string) =>
  api.post<Comment>(`/api/tasks/${taskId}/comments`, { content }).then(r => r.data)
export const deleteComment = (taskId: string, commentId: string) =>
  api.delete(`/api/tasks/${taskId}/comments/${commentId}`)

// Activity
export const getActivity = (taskId: string) => api.get<ActivityLog[]>(`/api/tasks/${taskId}/activity`).then(r => r.data)

// Members
export const getMembers = () => api.get<Member[]>('/api/members').then(r => r.data)
export const createMember = (data: Partial<Member>) => api.post<Member>('/api/members', data).then(r => r.data)
export const deleteMember = (id: string) => api.delete(`/api/members/${id}`)
export const addAssignee = (taskId: string, memberId: string) =>
  api.post(`/api/tasks/${taskId}/assignees`, { member_id: memberId })
export const removeAssignee = (taskId: string, memberId: string) =>
  api.delete(`/api/tasks/${taskId}/assignees/${memberId}`)

// Labels
export const getLabels = () => api.get<Label[]>('/api/labels').then(r => r.data)
export const createLabel = (data: Partial<Label>) => api.post<Label>('/api/labels', data).then(r => r.data)
export const deleteLabel = (id: string) => api.delete(`/api/labels/${id}`)
export const addTaskLabel = (taskId: string, labelId: string) =>
  api.post(`/api/tasks/${taskId}/labels`, { label_id: labelId })
export const removeTaskLabel = (taskId: string, labelId: string) =>
  api.delete(`/api/tasks/${taskId}/labels/${labelId}`)
