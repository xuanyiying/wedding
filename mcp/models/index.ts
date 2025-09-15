// MCP模型定义文件
// 这些是MCP服务内部使用的数据模型定义，与主服务的模型保持一致但独立

export interface User {
    id: string;
    username: string;
    email: string;
    phone?: string;
    role: string;
    status: string;
    avatarUrl?: string;
    realName?: string;
    nickname?: string;
    bio?: string;
    specialties?: any;
    experienceYears?: number;
    location?: string;
    contactInfo?: any;
    socialLinks?: any;
    lastLoginAt?: Date;
    lastLoginIp?: string;
    emailVerifiedAt?: Date;
    phoneVerifiedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}

export interface Work {
    id: string;
    userId: string;
    title: string;
    description: string | null;
    type: string;
    category: string;
    tags: string[] | null;
    location: string | null;
    weddingDate: Date | null;
    equipmentInfo: any | null;
    technicalInfo: any | null;
    status: string;
    isFeatured: boolean;
    viewCount: number;
    likeCount: number;
    shareCount: number;
    sortOrder: number;
    publishedAt: Date | null;
    fileIds: string[];
    files?: File[];
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
}

export interface Schedule {
    id: string;
    userId: string;
    customerId: string | null;
    customerName: string | null;
    title: string;
    description: string | null;
    weddingDate: Date;
    weddingTime: string;
    location: string | null;
    venueName: string | null;
    venueAddress: string | null;
    eventType: string;
    status: string;
    price: number | null;
    deposit: number | null;
    isPaid: boolean;
    customerPhone: string | null;
    requirements: string | null;
    notes: string | null;
    tags: string[] | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;
}

export interface Team {
    id: string;
    name: string;
    description?: string;
    avatar?: string;
    background?: string;
    contactPhone?: string;
    contactEmail?: string;
    contactWechat?: string;
    contactQq?: string;
    address?: string;
    serviceAreas?: string;
    specialties?: string;
    priceRange?: string;
    ownerId: string;
    memberCount: number;
    status: string;
    viewCount: number;
    rating: number;
    ratingCount: number;
    establishedAt?: Date;
    scale?: string;
    achievements?: string;
    certifications?: string;
    equipmentList?: string;
    servicePackages?: string;
    workingHours?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    bankAccount?: string;
    taxNumber?: string;
    legalRepresentative?: string;
    registrationAddress?: string;
    operatingAddress?: string;
    isVerified: boolean;
    businessLicense?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}

export interface File {
    id: string;
    userId: string;
    originalName: string;
    filename: string;
    filePath: string;
    fileUrl: string;
    fileSize: number;
    mimeType: string;
    fileType: string;
    category: string;
    width: number | null;
    height: number | null;
    duration: number | null;
    thumbnailUrl: string | null;
    hashMd5: string | null;
    hashSha256: string | null;
    ossType: string;
    bucketName: string | null;
    isPublic: boolean;
    downloadCount: number;
    metadata: any | null;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date;
}