<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class AiController extends Controller
{
    private string $aiServiceUrl;

    public function __construct()
    {
        $this->aiServiceUrl = rtrim(config('services.ai_service_url', 'http://127.0.0.1:8001'), '/');
    }

    /**
     * POST /api/ai/extract
     * Forwards raw incident text to the Python AI service and returns extracted form fields.
     */
    public function extract(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'text' => ['required', 'string', 'max:2000'],
        ]);

        try {
            $response = Http::timeout(30)->post("{$this->aiServiceUrl}/extract", [
                'text' => $validated['text'],
            ]);

            if ($response->failed()) {
                return response()->json([
                    'message' => 'AI service returned an error.',
                    'detail'  => $response->json('detail') ?? 'Unknown error',
                ], 502);
            }

            return response()->json($response->json());

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Could not reach the AI service. Make sure the Python service is running on port 8001.',
            ], 503);
        }
    }

    /**
     * POST /api/ai/chat
     * Fetches recent reports from the database, then asks the AI to answer the user's question.
     */
    public function chat(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'question'           => ['required', 'string', 'max:1000'],
            'geographic_type_id' => ['nullable', 'integer'],
        ]);

        $query = \App\Models\Report::query()
            ->with([
                'geographicType:id,name',
                'clients:id,report_id,full_name,age,gender,incident_address',
                'emergencyDetails:report_id,type_of_emergency,mechanism_of_injury,nature_of_illness,incident_time',
                'incidentDetails:report_id,type_of_hazard,severity_level,incident_barangay,incident_time,type_of_incident',
                'ambulanceTransfer:id,report_id,dispatcher,ambulance_driver',
            ])
            ->orderByDesc('date_reported')
            ->limit(200);

        if (!empty($validated['geographic_type_id'])) {
            $query->where('geographic_type_id', $validated['geographic_type_id']);
        }

        $reports = $query->get()->toArray();

        try {
            $response = Http::timeout(60)->post("{$this->aiServiceUrl}/chat", [
                'question' => $validated['question'],
                'reports'  => $reports,
            ]);

            if ($response->failed()) {
                return response()->json([
                    'message' => 'AI service returned an error.',
                    'detail'  => $response->json('detail') ?? 'Unknown error',
                ], 502);
            }

            return response()->json($response->json());

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Could not reach the AI service. Make sure the Python service is running on port 8001.',
            ], 503);
        }
    }
}
