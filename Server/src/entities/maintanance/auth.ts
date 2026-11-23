export interface User {
    userId: number;
    userName: string;
    loginUserName: string;
    email: string;
    passwordHash: string;
    createdAt: Date;
    createdBy: number | null;
    activeStatus: 'Y' | 'N';
    userType: 'EMPLOYEE' | 'CUSTOMER';
    customerId: number | null;
}


export interface LoginRequest {
    loginUserName: string;
    password: string;
}

export interface UserResponse {
    userId: number;
    userName: string;
    loginUserName: string;
    email: string;
    createdAt: Date;
    createdBy: number | null;
    activeStatus: 'Y' | 'N';
    userType: 'EMPLOYEE' | 'CUSTOMER';
    customerId: number | null;
    customerName?: string;
}
