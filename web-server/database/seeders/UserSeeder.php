<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'password'     => Hash::make('password123'),
                'email'        => 'mdrrmonabua2@gmail.com',
                'address'      => 'San Miguel Nabua Mddrmo offic',
                'phone_number' => '639471819217',
                'role'         => 'admin',
            ]
        );
    }
}