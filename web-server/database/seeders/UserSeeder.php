<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Admin account
        User::updateOrCreate(
            ['username' => 'admin'],
            [
                'full_name'    => 'Admin MDRRMO',
                'password'     => Hash::make('password123'),
                'email'        => 'mdrrmonabua2@gmail.com',
                'address'      => 'San Miguel Nabua MDRRMO Office',
                'phone_number' => '639471819217',
                'role'         => 'admin',
                'status'       => 'active',
            ]
        );

        // Staff account
        User::updateOrCreate(
            ['username' => 'staff01'],
            [
                'full_name'    => 'Staff User',
                'password'     => Hash::make('password123'),
                'email'        => 'staff01@mdrrmo.com',
                'address'      => 'Nabua Camarines Sur',
                'phone_number' => '639000000001',
                'role'         => 'staff',
                'status'       => 'active',
            ]
        );
    }
}
