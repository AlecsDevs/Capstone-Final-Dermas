<?php

namespace App\Http\Controllers;

use App\Models\Client;
use App\Models\ClientAssessment;
use App\Models\EmergencyDetail;
use App\Models\GeographicType;
use App\Models\IncidentDetail;
use App\Models\Report;
use App\Models\ReportNotification;
use App\Models\ReportPhoto;
use App\Models\Responder;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ReportController extends Controller
{
    public function myData(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(['Draft', 'Submitted', 'Approved', 'Rejected'])],
            'limit' => ['nullable', 'integer', 'min:1', 'max:2000'],
        ]);

        $limit = $validated['limit'] ?? 500;
        $userId = (int) $request->user()->id;
        $username = trim((string) $request->user()->username);
        $normalizedUsername = mb_strtolower($username);

        $query = Report::query()
            ->select(['id', 'report_type', 'geographic_type_id', 'date_reported', 'time_reported', 'status'])
            ->with([
                'geographicType:id,name',
                'clients:id,report_id,full_name,age,gender,incident_address',
                'emergencyDetails:report_id,type_of_emergency,mechanism_of_injury,nature_of_illness,dispatcher_name,incident_time',
                'incidentDetails:report_id,type_of_hazard,nature_of_call,dispatcher_name,incident_time',
                'responders:id,report_id,name,user_id',
            ])
            ->whereHas('responders', function ($responderQuery) use ($userId, $normalizedUsername) {
                $responderQuery->where('user_id', $userId);

                if ($normalizedUsername !== '') {
                    // Fallback for legacy rows where responder was saved by name only.
                    $responderQuery->orWhereRaw('LOWER(TRIM(name)) = ?', [$normalizedUsername]);
                }
            })
            ->orderByDesc('date_reported')
            ->orderByDesc('time_reported');

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $reports = $query->limit($limit)->get();

        return response()->json($reports);
    }

    public function summary(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'geographic_type_id' => ['nullable', 'integer', 'exists:geographic_types,id'],
            'report_type' => ['nullable', Rule::in(['Emergency', 'Incident'])],
            'status' => ['nullable', Rule::in(['Draft', 'Submitted', 'Approved', 'Rejected'])],
            'limit' => ['nullable', 'integer', 'min:1', 'max:2000'],
        ]);

        $limit = $validated['limit'] ?? 500;

        $cacheKey = sprintf(
            'reports:summary:geo=%s:type=%s:status=%s:limit=%d',
            $validated['geographic_type_id'] ?? 'all',
            $validated['report_type'] ?? 'all',
            $validated['status'] ?? 'all',
            $limit
        );

        $reports = Cache::remember($cacheKey, now()->addSeconds(20), function () use ($validated, $limit) {
            $query = Report::query()
                ->select(['id', 'report_type', 'geographic_type_id', 'date_reported', 'time_reported', 'status'])
                ->with([
                    'geographicType:id,name',
                    'clients:id,report_id,full_name,age,gender,incident_address',
                    'emergencyDetails:report_id,type_of_emergency,mechanism_of_injury,nature_of_illness,dispatcher_name,incident_time',
                    'incidentDetails:report_id,type_of_hazard,nature_of_call,dispatcher_name,incident_time',
                    'responders:id,report_id,name',
                ])
                ->orderByDesc('date_reported')
                ->orderByDesc('time_reported');

            if (!empty($validated['geographic_type_id'])) {
                $query->where('geographic_type_id', $validated['geographic_type_id']);
            }

            if (!empty($validated['report_type'])) {
                $query->where('report_type', $validated['report_type']);
            }

            if (!empty($validated['status'])) {
                $query->where('status', $validated['status']);
            }

            return $query->limit($limit)->get();
        });

        return response()->json($reports);
    }

    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'geographic_type_id' => ['nullable', 'integer', 'exists:geographic_types,id'],
            'report_type' => ['nullable', Rule::in(['Emergency', 'Incident'])],
            'status' => ['nullable', Rule::in(['Draft', 'Submitted', 'Approved', 'Rejected'])],
        ]);

        $query = Report::query()
            ->with([
                'geographicType:id,name',
                'clients:id,report_id,full_name,age,gender,incident_address',
                'emergencyDetails:report_id,type_of_emergency,mechanism_of_injury,nature_of_illness,dispatcher_name,incident_time',
                'incidentDetails:report_id,type_of_hazard,nature_of_call,dispatcher_name,incident_time',
                'responders:id,report_id,name,user_id',
            ])
            ->orderByDesc('date_reported')
            ->orderByDesc('time_reported');

        if (!empty($validated['geographic_type_id'])) {
            $query->where('geographic_type_id', $validated['geographic_type_id']);
        }

        if (!empty($validated['report_type'])) {
            $query->where('report_type', $validated['report_type']);
        }

        if (!empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        $reports = $query->get();

        return response()->json($reports);
    }

    public function geographicTypes(): JsonResponse
    {
        $types = GeographicType::query()
            ->select(['id', 'name'])
            ->orderBy('id')
            ->get();

        return response()->json($types);
    }

    public function storeDraft(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'report_type' => ['required', Rule::in(['Emergency', 'Incident'])],
            'geographic_type_id' => ['required', 'integer', 'exists:geographic_types,id'],
            'date_reported' => ['required', 'date'],
            'time_reported' => ['required', 'date_format:H:i'],
            'status' => ['sometimes', Rule::in(['Draft', 'Submitted', 'Approved', 'Rejected'])],
        ]);

        $report = Report::create([
            'report_type' => $validated['report_type'],
            'geographic_type_id' => $validated['geographic_type_id'],
            'date_reported' => $validated['date_reported'],
            'time_reported' => $validated['time_reported'],
            'status' => $validated['status'] ?? 'Draft',
        ]);

        return response()->json([
            'message' => 'Draft report created successfully.',
            'report' => $this->loadReport($report),
        ], 201);
    }

    public function show(Report $report): JsonResponse
    {
        return response()->json($this->loadReport($report));
    }

    public function updateDraft(Request $request, Report $report): JsonResponse
    {
        $validated = $request->validate([
            'geographic_type_id' => ['sometimes', 'integer', 'exists:geographic_types,id'],
            'date_reported' => ['sometimes', 'date'],
            'time_reported' => ['sometimes', 'date_format:H:i'],
        ]);

        if (!empty($validated)) {
            $report->update($validated);
        }

        return response()->json([
            'message' => 'Report draft updated successfully.',
            'report' => $this->loadReport($report->fresh()),
        ]);
    }

    public function destroy(Report $report): JsonResponse
    {
        $report->load('photos');

        foreach ($report->photos as $photo) {
            $path = (string) $photo->photo_path;

            if (str_starts_with($path, '/storage/')) {
                $publicRelativePath = substr($path, strlen('/storage/'));
                Storage::disk('public')->delete($publicRelativePath);
            }
        }

        $report->delete();

        return response()->json([
            'message' => 'Report deleted successfully.',
        ]);
    }

    public function upsertClients(Request $request, Report $report): JsonResponse
    {
        $validated = $request->validate([
            'clients' => ['required', 'array', 'min:1'],
            'clients.*.full_name' => ['required', 'string', 'max:150'],
            'clients.*.age' => ['nullable', 'integer', 'min:0', 'max:120'],
            'clients.*.gender' => ['required', Rule::in(['Male', 'Female'])],
            'clients.*.nationality' => ['nullable', 'string', 'max:100'],
            'clients.*.contact_number' => ['nullable', 'string', 'max:20'],
            'clients.*.permanent_address' => ['nullable', 'string'],
            'clients.*.incident_address' => ['nullable', 'string'],
        ]);

        DB::transaction(function () use ($report, $validated) {
            $report->clients()->delete();

            foreach ($validated['clients'] as $clientPayload) {
                $report->clients()->create($clientPayload);
            }
        });

        return response()->json([
            'message' => 'Client information saved successfully.',
            'report' => $this->loadReport($report->fresh()),
        ]);
    }

    public function upsertEmergencyDetails(Request $request, Report $report): JsonResponse
    {
        if ($report->report_type !== 'Emergency') {
            return response()->json([
                'message' => 'This report is not an Emergency report.',
            ], 422);
        }

        $validated = $request->validate([
            'mechanism_of_injury' => ['nullable', 'string', 'max:150'],
            'nature_of_illness' => ['nullable', 'string', 'max:150'],
            'type_of_emergency' => ['nullable', 'string', 'max:100'],
            'incident_date' => ['required', 'date'],
            'incident_time' => ['required', 'date_format:H:i'],
            'dispatcher_name' => ['required', 'string', 'max:100'],
        ]);

        EmergencyDetail::query()->updateOrCreate(
            ['report_id' => $report->id],
            $validated
        );

        return response()->json([
            'message' => 'Emergency incident details saved successfully.',
            'report' => $this->loadReport($report->fresh()),
        ]);
    }

    public function upsertIncidentDetails(Request $request, Report $report): JsonResponse
    {
        if ($report->report_type !== 'Incident') {
            return response()->json([
                'message' => 'This report is not an Incident report.',
            ], 422);
        }

        $validated = $request->validate([
            'type_of_hazard' => ['required', Rule::in(['Flood', 'Earthquake', 'Typhoon', 'Landslide'])],
            'nature_of_call' => ['required', Rule::in(['Emergency', 'Coordination', 'Search and Rescue'])],
            'incident_date' => ['required', 'date'],
            'incident_time' => ['required', 'date_format:H:i'],
            'dispatcher_name' => ['required', 'string', 'max:100'],
        ]);

        IncidentDetail::query()->updateOrCreate(
            ['report_id' => $report->id],
            $validated
        );

        return response()->json([
            'message' => 'Incident details saved successfully.',
            'report' => $this->loadReport($report->fresh()),
        ]);
    }

    public function upsertAssessment(Request $request, Report $report): JsonResponse
    {
        if ($report->report_type !== 'Emergency') {
            return response()->json([
                'message' => 'Assessment is only available for Emergency reports.',
            ], 422);
        }

        $primaryClient = $report->clients()->orderBy('id')->first();
        if (!$primaryClient) {
            return response()->json([
                'message' => 'Please save client information before assessment.',
            ], 422);
        }

        $validated = $request->validate([
            'chief_complaint' => ['nullable', 'string'],
            'assessment' => ['nullable', 'string'],
            'airway' => ['nullable', 'string', 'max:255'],
            'breathing' => ['nullable', 'string', 'max:255'],
            'circulation_support' => ['nullable', 'string', 'max:255'],
            'circulation' => ['nullable', 'string', 'max:255'],
            'wound_care' => ['nullable', 'string', 'max:255'],
            'miscellaneous' => ['nullable', 'string', 'max:255'],
            'history_of_coronary_disease' => ['nullable', Rule::in(['Yes', 'No', 'Undetermined'])],
            'coronary' => ['nullable', Rule::in(['Yes', 'No', 'Undetermined'])],
            'collapse_witness' => ['nullable', Rule::in(['Yes', 'No'])],
            'time_of_collapse' => ['nullable', 'date_format:H:i'],
            'start_of_cpr' => ['nullable', 'date_format:H:i'],
            'defibrillation_time' => ['nullable', 'date_format:H:i'],
            'cpr_duration' => ['nullable', 'integer', 'min:0', 'max:300'],
            'rosc' => ['nullable', 'string', 'max:255'],
            'transferred_to_hospital' => ['nullable', 'string', 'max:255'],
        ]);

        $assessmentPayload = [
            'chief_complaint' => $validated['chief_complaint'] ?? $validated['assessment'] ?? null,
            'airway' => $validated['airway'] ?? null,
            'breathing' => $validated['breathing'] ?? null,
            'circulation_support' => $validated['circulation_support'] ?? $validated['circulation'] ?? null,
            'wound_care' => $validated['wound_care'] ?? null,
            'miscellaneous' => $validated['miscellaneous'] ?? null,
            'history_of_coronary_disease' => $validated['history_of_coronary_disease'] ?? $validated['coronary'] ?? null,
            'collapse_witness' => $validated['collapse_witness'] ?? null,
            'time_of_collapse' => $validated['time_of_collapse'] ?? null,
            'start_of_cpr' => $validated['start_of_cpr'] ?? null,
            'defibrillation_time' => $validated['defibrillation_time'] ?? null,
            'cpr_duration' => $validated['cpr_duration'] ?? null,
            'rosc' => $validated['rosc'] ?? null,
            'transferred_to_hospital' => $validated['transferred_to_hospital'] ?? null,
        ];

        ClientAssessment::query()->updateOrCreate(
            ['client_id' => $primaryClient->id],
            $assessmentPayload
        );

        return response()->json([
            'message' => 'Assessment and care details saved successfully.',
            'report' => $this->loadReport($report->fresh()),
        ]);
    }

    public function upsertResponders(Request $request, Report $report): JsonResponse
    {
        $validated = $request->validate([
            'responders' => ['required', 'array'],
            'responders.*' => ['required'],
        ]);

        DB::transaction(function () use ($report, $validated) {
            $report->responders()->delete();

            foreach ($validated['responders'] as $responder) {
                if (is_string($responder)) {
                    $name = trim($responder);
                    if ($name === '') {
                        continue;
                    }

                    $matchedUserId = User::query()
                        ->whereRaw('LOWER(TRIM(username)) = ?', [mb_strtolower($name)])
                        ->value('id');

                    $report->responders()->create([
                        'name' => $name,
                        'user_id' => $matchedUserId ? (int) $matchedUserId : null,
                    ]);

                    continue;
                }

                if (!is_array($responder)) {
                    continue;
                }

                $name = isset($responder['name']) ? trim((string) $responder['name']) : null;
                $userId = isset($responder['user_id']) ? (int) $responder['user_id'] : null;

                if (!$userId && $name) {
                    $matchedUserId = User::query()
                        ->whereRaw('LOWER(TRIM(username)) = ?', [mb_strtolower($name)])
                        ->value('id');
                    $userId = $matchedUserId ? (int) $matchedUserId : null;
                }

                if (!$name && !$userId) {
                    continue;
                }

                $payload = [];
                if ($name) {
                    $payload['name'] = $name;
                }
                if ($userId) {
                    $payload['user_id'] = $userId;
                }

                $report->responders()->create($payload);
            }
        });

        return response()->json([
            'message' => 'Responders saved successfully.',
            'report' => $this->loadReport($report->fresh()),
        ]);
    }

    public function upsertPhotos(Request $request, Report $report): JsonResponse
    {
        $validated = $request->validate([
            'photo_paths' => ['required', 'array', 'min:1'],
            'photo_paths.*' => ['required', 'string', 'max:255'],
        ]);

        DB::transaction(function () use ($report, $validated) {
            $report->photos()->delete();

            foreach ($validated['photo_paths'] as $path) {
                ReportPhoto::query()->create([
                    'report_id' => $report->id,
                    'photo_path' => $path,
                ]);
            }
        });

        return response()->json([
            'message' => 'Photo references saved successfully.',
            'report' => $this->loadReport($report->fresh()),
        ]);
    }

    public function uploadPhoto(Request $request, Report $report): JsonResponse
    {
        $validated = $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:20480'],
        ]);

        DB::transaction(function () use ($report, $validated) {
            $report->photos()->delete();

            $storedPath = $validated['photo']->store("reports/{$report->id}", 'public');

            ReportPhoto::query()->create([
                'report_id' => $report->id,
                'photo_path' => Storage::url($storedPath),
            ]);
        });

        return response()->json([
            'message' => 'Photo uploaded successfully.',
            'report' => $this->loadReport($report->fresh()),
        ]);
    }

    public function submit(Request $request, Report $report): JsonResponse
    {
        $errors = $this->validateBeforeSubmit($report->fresh());

        if (!empty($errors)) {
            return response()->json([
                'message' => 'Report is incomplete.',
                'errors' => $errors,
            ], 422);
        }

        $wasSubmitted = $report->status === 'Submitted';
        $report->update(['status' => 'Submitted']);

        $submittedReport = $this->loadReport($report->fresh());

        $hasExistingNotifications = ReportNotification::query()
            ->where('report_id', (int) $submittedReport->id)
            ->exists();

        if (!$wasSubmitted || !$hasExistingNotifications) {
            $actor = $request->user();
            $actorUsername = trim((string) ($actor->username ?? 'Unknown User'));
            $primaryClientName = $submittedReport->clients->first()?->full_name;
            $submittedAt = now();

            $recipientIds = User::query()
                ->whereIn('role', ['admin', 'staff'])
                ->where('status', 'active')
                ->pluck('id');

            $payloads = [];
            foreach ($recipientIds as $recipientId) {
                $payloads[] = [
                    'user_id' => (int) $recipientId,
                    'report_id' => (int) $submittedReport->id,
                    'actor_user_id' => $actor?->id,
                    'actor_username' => $actorUsername,
                    'report_type' => (string) $submittedReport->report_type,
                    'client_name' => $primaryClientName,
                    'submitted_at' => $submittedAt,
                    'is_read' => false,
                    'read_at' => null,
                    'created_at' => $submittedAt,
                    'updated_at' => $submittedAt,
                ];
            }

            if (!empty($payloads)) {
                ReportNotification::query()->insert($payloads);
            }
        }

        return response()->json([
            'message' => 'Report submitted successfully.',
            'report' => $submittedReport,
        ]);
    }

    private function validateBeforeSubmit(Report $report): array
    {
        $issues = [];

        if ($report->clients()->count() < 1) {
            $issues[] = 'At least one client is required.';
        }

        if ($report->responders()->count() < 1) {
            $issues[] = 'At least one responder is required.';
        }

        if ($report->report_type === 'Emergency') {
            if (!$report->emergencyDetails) {
                $issues[] = 'Emergency incident details are required.';
            }
        }

        if ($report->report_type === 'Incident' && !$report->incidentDetails) {
            $issues[] = 'Incident details are required.';
        }

        return $issues;
    }

    private function loadReport(Report $report): Report
    {
        return $report->load([
            'geographicType:id,name',
            'clients.assessment',
            'emergencyDetails',
            'incidentDetails',
            'responders',
            'photos',
        ]);
    }
}
