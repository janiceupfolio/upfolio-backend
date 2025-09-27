// ------------------------    STATUS CODES    -------------------
export const STATUS_CODES = {
  // 1XX INFORMATIONAL
  CONTINUE: 100,
  SWITCHING_PROTOCOLS: 101,
  PROCESSING: 102,
  EARLY_HINTS: 103,

  // 2XX SUCCESS
  SUCCESS: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NON_AUTHORITATIVE_INFORMATION: 203,
  NO_CONTENT: 204,
  RESET_CONTENT: 205,
  PARTIAL_CONTENT: 206,
  MULTI_STATUS: 207,
  ALREADY_REPORTED: 208,
  IM_USED: 226,

  // 3XX REDIRECTION
  MULTIPLE_CHOICES: 300,
  MOVED_PERMANENTLY: 301,
  FOUND: 302,
  SEE_OTHER: 303,
  NOT_MODIFIED: 304,
  USE_PROXY: 305,
  TEMPORARY_REDIRECT: 307,
  PERMANENT_REDIRECT: 308,

  // 4XX CLIENT ERROR
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  PAYMENT_REQUIRED: 402,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  NOT_ALLOWED: 405,
  NOT_ACCEPTABLE: 406,
  PROXY_AUTHENTICATION_REQUIRED: 407,
  REQUEST_TIMEOUT: 408,
  CONFLICT: 409,
  GONE: 410,
  LENGTH_REQUIRED: 411,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  URI_TOO_LONG: 414,
  UNSUPPORTED_MEDIA_TYPE: 415,
  RANGE_NOT_SATISFIABLE: 416,
  EXPECTATION_FAILED: 417,
  UN_PROCESSABLE_ENTITY: 422,
  VALIDATION_ERROR: 422,
  NOT_VALID_DATA: 422,
  LOCKED: 423,
  FAILED_DEPENDENCY: 424,
  UNORDERED_COLLECTION: 425,
  UPGRADE_REQUIRED: 426,
  PRECONDITION_REQUIRED: 428,
  TOO_MANY_REQUESTS: 429,
  REQUEST_HEADER_FIELDS_TOO_LARGE: 431,
  UNAVAILABLE_FOR_LEGAL_REASONS: 451,

  // 5XX SERVER ERROR
  SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
  HTTP_VERSION_NOT_SUPPORTED: 505,
  VARIANT_ALSO_NEGOTIATES: 506,
  INSUFFICIENT_STORAGE: 507,
  LOOP_DETECTED: 508,
  BANDWIDTH_LIMIT_EXCEEDED: 509,
  NOT_EXTENDED: 510,
  NETWORK_AUTHENTICATION_REQUIRED: 511,
};

export const STATUS_MESSAGE = {
  ERROR_MESSAGE: {
    INTERNAL_SERVER_ERROR: "Internal Server Error"
  },
  USER: {
    USER_LOGIN: "Login successful!",
    USER_INFO: "User data fetch successfully",
    USER_REGISTRATION: "Registration successful!",
    USER_PROFILE: "User profile fetched successfully",
    OTP_SEND: "OTP has been sent successfully. Please check your email.",
    OTP_VERIFIED: "OTP verified successfully",
    USER_UPDATED: "User profile updated successfully",
    NEWSLETTER_SUBSCRIBED: "Newsletter subscribed successfully",
    ERROR_MESSAGE: {
      ID_REQUIRED: "Customer Id required",
      PHONE_NUMBER_REQUIRED: "Phone number required",
      NAME_REQUIRED: "Name required",
      FIRST_NAME_REQUIRED: "First name required",
      EMAIL: "Invalid email formate",
      PASSWORD_REQUIRED: "Password required",
      EMAIL_REQUIRED: 'Email required',
      USER_ALREADY_EXIST: "The email address provided is already in use. Please provide a different email address.",
      USER_NOT_FOUND: "User not found",
      INVALID_CREDENTIAL: "Invalid email or password",
      OTP_REQUIRED: "OTP required",
      INVALID_OTP: "Invalid OTP",
      ALREADY_SUBSCRIBED: "Newsletter already subscribed",
    }
  },
  CUSTOMER_ADDRESS: {
    ADDRESS_CREATE: "Address created successfully",
    ADDRESS_UPDATE: "Address updated successfully",
    ADDRESS_DELETE: "Address deleted successfully",
    ADDRESS_LIST: "Address list fetched successfully",
    ADDRESS_DETAILS: "Address details fetched successfully",
    ADDRESS_STATUS_UPDATE: "Address status updated successfully",
    ERROR_MESSAGE: {
      ADDRESS_NOT_FOUND: "Address not found",
      ADDRESS_EXIST: "Address already exist",
      ADDRESS_REQUIRED: "Address required",
      ADDRESS_ID_REQUIRED: "Address Id required",
      ADDRESS_TYPE_REQUIRED: "Address type required",
      ADDRESS_TYPE_INVALID: "Invalid address type",
      DEFAULT_ADDRESS_ALREADY_SET: "Default address already set",
    }
  },
  QUALIFICATION: {
    CREATED: "Qualification created successfully",
    ERROR_MESSAGE: {
      QUALIFICATION_NOT_FOUND: "Qualification not found",
      QUALIFICATION_ID_REQUIRED: "Qualification Id required",
      QUALIFICATION_ALREADY_EXIST: "Qualification already exist",
      QUALIFICATION_REQUIRED: "Qualification required",
    }
  },
  VALIDATION: {
    USER: {
      INVALID_CREDENTIAL: "Invalid email or password",
    },
    TOKEN: {
      TOKEN_VALIDATION: "Invalid login token",
    },
    STATUS_REQUIRED: "Status required",
    STATUS_INVALID: "Invalid status",
    INTERNAL_SERVER_ERROR: "Internal Server Error"
  },
  DASHBOARD: {
    DASHBOARD_DATA: "Dashboard data fetched successfully",
  },
  ORDER: {
    PAYMENT_SUCCESS: "Payment Success",
    PAYMENT_INITIATED: "Payment Initiated",
    ORDER_HISTORY: "Order history fetched successfully",
    ERROR_MESSAGE: {
      ORDER_NOT_FOUND: "Order not found",
      CART_ID_REQUIRED: "Cart Id required",
      PAYMENT_FAILED: "Payment Failed",
      CART_NOT_FOUND: "Cart not found",
    }
  }
};

export const STATUS = {
  ACTIVE: 1,
  IN_ACTIVE: 2,
  DELETE: 3,
};

export const Roles = {
  SUPER_ADMIN: 1,
  ASSESSOR: 2,
  LEARNER: 3,
  OBSERVER: 4,
  IQA: 5,
  EQA: 6,
  ADMIN: 7,
}

export const RoleRoleSlug = {
  1: "super-admin",
  2: "assessor",
  3: "learner",
  4: "observer",
  5: "iqa",
  6: "eqa",
  7: "admin",
}

export const Entity = {
  ASSESSMENT: 'assessment',
  LEARNER_ASSESSMENT: "leaner_assessment",
  LEARNER: 'learner',
  ASSESSOR: 'assessor',
  OBSERVER: 'observer',
  IQA: 'iqa',
  EQA: 'eqa',
  MODULE_RECORDS: "module_records"
}

export const EntityType = {
  IMAGE: 'images',
  VIDEO: 'video',
  DOCUMENT: 'document',
  AUDIO: 'audio',
  OTHER: 'other',
}

export const AssessmentStatus = {
  ASSESSMENT_CREATE: 1,
  LEARNER_AGREED: 2,
  ASSESSOR_REJECT: 3,
  ASSESSMENT_COMPLETED: 4,
  NOT_AGREED_BY_IQA: 5,
  AGREED_BY_IQA: 6,
  ASSESSMENT_DELETE: 12
}

export const RoleSlug = {
  SUPER_ADMIN: "super-admin",
  ASSESSOR: "assessor",
  LEARNER: "learner",
  OBSERVER: "observer",
  IQA: "iqa",
  EQA: "eqa",
  ADMIN: "admin",
}

export const ModuleTypes = {
  // 1: resources, 2: journal, 3: additional_info, 4: contact_log
  RESOURCE: 1,
  JOURNAL: 2,
  ADDITIONAL_INFO: 3,
  CONTACT_LOG: 4,
  PROGRESS_REVIEW: 5,
  LIBRARY: 6,
}