import api from '../api/axios'

export function useAiAssistant() {
  const chatWithData = async (question: string, geographicTypeId?: number | null): Promise<string> => {
    const res = await api.post<{ answer: string }>('/ai/chat', {
      question,
      geographic_type_id: geographicTypeId ?? null,
    })
    return res.data.answer
  }

  return { chatWithData }
}
