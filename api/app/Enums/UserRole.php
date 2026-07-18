<?php

namespace App\Enums;

enum UserRole: string
{
    case Customer = 'customer';
    case Owner = 'owner';
    case Admin = 'admin';
    // Employee of a billboard company (created by an owner, never self-registered).
    // Gets the Tangazaa Partner workspace scoped to their employer — not the
    // owner dashboard or the owner's account.
    case Staff = 'staff';
}
