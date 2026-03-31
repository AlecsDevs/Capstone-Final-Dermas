<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class AuthController extends Controller
{
    // Login
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = User::where('username', $request->username)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Invalid username or password'
            ], 401);
        }

        if (($user->status ?? 'active') === 'inactive') {
            return response()->json([
                'message' => 'Your account is deactivated. Please contact admin.'
            ], 403);
        }

        $deviceName = trim((string) $request->header('X-Device-Name', 'Web Browser'));
        $ipAddress = (string) $request->ip();
        $userAgent = substr((string) $request->userAgent(), 0, 255);
        $tokenName = "auth_token:$deviceName";

        // Create token with 8-hour expiry
        $token = $user->createToken($tokenName, ['*'], now()->addHours(8));

        DB::table('personal_access_tokens')
            ->where('id', $token->accessToken->id)
            ->update([
                'device_name' => $deviceName,
                'ip_address' => $ipAddress,
                'user_agent' => $userAgent,
            ]);
        return response()->json([
            'token' => $token->plainTextToken,
            'user'  => [
                'id'         => $user->id,
                'username'   => $user->username,
                'email'      => $user->email,
                'address'    => $user->address,
                'phone_number' => $user->phone_number,
                'role'       => $user->role,
                'status'     => $user->status,
                'created_at' => $user->created_at,
            ],
            'session' => [
                'device_name' => $deviceName,
                'ip_address'  => $ipAddress,
                'user_agent'  => $userAgent,
            ],
        ]);
    }


    // Logout
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    // Get current logged in user
    public function me(Request $request)
    {
        $user = $request->user();

        if (($user->status ?? 'active') === 'inactive') {
            $request->user()->currentAccessToken()?->delete();
            return response()->json([
                'message' => 'Your account is deactivated. Please contact admin.'
            ], 403);
        }

        return response()->json($user);
    }

    // Get all users (admin only)
    public function index()
    {
        $users = User::select('id', 'username', 'email', 'address', 'phone_number', 'role', 'status', 'created_at')->get();
        return response()->json($users);
    }

    // Create new user (admin only)
    public function store(Request $request)
    {
        $request->validate([
            'username' => 'required|string|unique:users',
            'email'    => 'required|email|unique:users,email',
            'address'  => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:50',
            'password' => 'required|string|min:6',
            'role'     => 'required|in:admin,staff',
            'status'   => 'nullable|in:active,inactive',
        ]);

        $user = User::create([
            'username' => $request->username,
            'password' => Hash::make($request->password),
            'email'    => $request->email,
            'address'  => $request->address,
            'phone_number' => $request->phone_number,
            'role'     => $request->role,
            'status'   => $request->status ?? 'active',
        ]);

        return response()->json([
            'message' => 'User created successfully',
            'user'    => $user
        ], 201);
    }

    // Delete user (admin only)
    public function destroy($id)
    {
        $user = User::findOrFail($id);
        $user->delete();
        return response()->json(['message' => 'User deleted successfully']);
    }

    // Update user account status (admin only)
    public function updateStatus(Request $request, $id)
    {
        $request->validate([
            'status' => 'required|in:active,inactive',
        ]);

        $user = User::findOrFail($id);
        $user->status = $request->status;
        $user->save();

        return response()->json([
            'message' => 'User status updated successfully',
            'user' => $user,
        ]);
    }

    // Update user profile (admin only)
    public function updateUser(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'username' => ['required', 'string', Rule::unique('users', 'username')->ignore($user->id)],
            'email' => ['required', 'email', Rule::unique('users', 'email')->ignore($user->id)],
            'address' => 'nullable|string|max:255',
            'phone_number' => 'nullable|string|max:50',
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'User profile updated successfully',
            'user' => $user,
        ]);
    }

    // Change password for a target user (admin/account center)
    public function changePassword(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'current_password' => 'required|string|min:6',
            'new_password' => 'required|string|min:6|different:current_password|confirmed',
            'logout_all_devices' => 'nullable|boolean',
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json([
                'message' => 'Current password is incorrect.'
            ], 422);
        }

        $user->password = Hash::make($validated['new_password']);
        $user->save();

        $revokedCount = 0;
        if (($validated['logout_all_devices'] ?? false) === true) {
            $revokedCount = DB::table('personal_access_tokens')
                ->where('tokenable_type', User::class)
                ->where('tokenable_id', $user->id)
                ->delete();
        }

        return response()->json([
            'message' => 'Password updated successfully',
            'revoked_count' => $revokedCount,
        ]);
    }

    // Revoke all active sessions for a target user (admin only)
    public function logoutAllDevices($id)
    {
        $user = User::findOrFail($id);

        $count = DB::table('personal_access_tokens')
            ->where('tokenable_type', User::class)
            ->where('tokenable_id', $user->id)
            ->delete();

        return response()->json([
            'message' => 'All active sessions logged out successfully',
            'revoked_count' => $count,
        ]);
    }

    // Return the number of active (non-expired) sessions for the current user
    public function sessionCheck(Request $request)
    {
        $count = $request->user()->tokens()
            ->where(function ($q) {
                $q->whereNull('expires_at')
                  ->orWhere('expires_at', '>', now());
            })
            ->count();
        return response()->json(['session_count' => $count]);
    }

}
