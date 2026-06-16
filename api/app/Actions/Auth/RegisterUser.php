<?php

namespace App\Actions\Auth;

use App\Enums\UserRole;
use App\Models\User;

class RegisterUser
{
    public function handle(array $data): User
    {
        return User::create([
            'name' => $data['name'],
            'company_name' => $data['company_name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => UserRole::from($data['role']),
        ]);
    }
}
