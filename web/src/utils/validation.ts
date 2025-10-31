// 服务端验证结果展示工具

// 验证错误类型定义
export interface ValidationError {
  field: string;
  value: any;
  rule: string;
  message: string;
  type: "required" | "format" | "range" | "custom";
}

// 验证结果类型定义
export interface ValidationResult {
  isValid: boolean;
  error?: ValidationError;
  errors?: ValidationError[];
}

// 服务端API响应中的验证错误格式
export interface ServerValidationError {
  field?: string;
  message: string;
  value?: any;
  code?: string;
}

// API响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: ServerValidationError[];
}

/**
 * 验证结果展示工具类
 * 专门用于处理和展示服务端返回的验证结果
 */
export class ValidationDisplayHelper {
  /**
   * 将服务端验证错误转换为前端展示格式
   */
  static formatServerErrors(serverErrors: ServerValidationError[]): ValidationError[] {
    return serverErrors.map(error => ({
      field: error.field || 'unknown',
      value: error.value,
      rule: error.code || 'server_validation',
      message: error.message,
      type: this.inferErrorType(error.code || error.message)
    }));
  }

  /**
   * 根据错误代码或消息推断错误类型
   */
  private static inferErrorType(codeOrMessage: string): ValidationError["type"] {
    const lowerCase = codeOrMessage.toLowerCase();
    
    if (lowerCase.includes('required') || lowerCase.includes('必填') || lowerCase.includes('必须')) {
      return 'required';
    }
    
    if (lowerCase.includes('format') || lowerCase.includes('格式') || lowerCase.includes('invalid')) {
      return 'format';
    }
    
    if (lowerCase.includes('range') || lowerCase.includes('范围') || lowerCase.includes('长度') || 
        lowerCase.includes('min') || lowerCase.includes('max')) {
      return 'range';
    }
    
    return 'custom';
  }

  /**
   * 获取字段的第一个错误消息
   */
  static getFieldError(errors: ValidationError[], fieldName: string): string | null {
    const fieldError = errors.find(error => error.field === fieldName);
    return fieldError ? fieldError.message : null;
  }

  /**
   * 获取所有错误消息的数组
   */
  static getAllErrorMessages(errors: ValidationError[]): string[] {
    return errors.map(error => error.message);
  }

  /**
   * 获取格式化的错误消息字符串
   */
  static getFormattedErrorMessage(errors: ValidationError[], separator: string = '; '): string {
    return this.getAllErrorMessages(errors).join(separator);
  }

  /**
   * 检查特定字段是否有错误
   */
  static hasFieldError(errors: ValidationError[], fieldName: string): boolean {
    return errors.some(error => error.field === fieldName);
  }

  /**
   * 按字段分组错误
   */
  static groupErrorsByField(errors: ValidationError[]): Record<string, ValidationError[]> {
    return errors.reduce((groups, error) => {
      const field = error.field;
      if (!groups[field]) {
        groups[field] = [];
      }
      groups[field].push(error);
      return groups;
    }, {} as Record<string, ValidationError[]>);
  }

  /**
   * 从API响应中提取验证错误
   */
  static extractValidationErrors(response: ApiResponse): ValidationError[] {
    if (!response.errors || response.errors.length === 0) {
      return [];
    }
    
    return this.formatServerErrors(response.errors);
  }

  /**
   * 检查API响应是否包含验证错误
   */
  static hasValidationErrors(response: ApiResponse): boolean {
    return !response.success && !!response.errors && response.errors.length > 0;
  }

  /**
   * 创建错误消息的HTML展示
   */
  static createErrorHtml(errors: ValidationError[], className: string = 'validation-error'): string {
    if (errors.length === 0) return '';
    
    const errorItems = errors.map(error => 
      `<div class="${className}-item" data-field="${error.field}" data-type="${error.type}">
        ${this.escapeHtml(error.message)}
      </div>`
    ).join('');
    
    return `<div class="${className}">${errorItems}</div>`;
  }

  /**
   * HTML转义工具函数
   */
  private static escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 为表单字段添加错误样式类
   */
  static addErrorClass(element: HTMLElement | null, className: string = 'error'): void {
    if (element && !element.classList.contains(className)) {
      element.classList.add(className);
    }
  }

  /**
   * 移除表单字段的错误样式类
   */
  static removeErrorClass(element: HTMLElement | null, className: string = 'error'): void {
    if (element && element.classList.contains(className)) {
      element.classList.remove(className);
    }
  }

  /**
   * 清除表单的所有验证错误状态
   */
  static clearFormErrors(formElement: HTMLFormElement, errorClassName: string = 'error'): void {
    // 移除所有字段的错误样式
    const errorElements = formElement.querySelectorAll(`.${errorClassName}`);
    errorElements.forEach(element => {
      element.classList.remove(errorClassName);
    });

    // 移除所有错误消息元素
    const errorMessages = formElement.querySelectorAll('.validation-error, .validation-error-item');
    errorMessages.forEach(element => {
      element.remove();
    });
  }

  /**
   * 在表单字段旁边显示错误消息
   */
  static displayFieldError(
    fieldElement: HTMLElement, 
    errorMessage: string, 
    errorClassName: string = 'validation-error'
  ): void {
    // 先清除已有的错误消息
    const existingError = fieldElement.parentElement?.querySelector(`.${errorClassName}`);
    if (existingError) {
      existingError.remove();
    }

    // 添加错误样式
    this.addErrorClass(fieldElement, 'error');

    // 创建错误消息元素
    const errorElement = document.createElement('div');
    errorElement.className = errorClassName;
    errorElement.textContent = errorMessage;

    // 插入错误消息
    if (fieldElement.parentElement) {
      fieldElement.parentElement.insertBefore(errorElement, fieldElement.nextSibling);
    }
  }
}

// 导出默认实例以便直接使用
export const validationHelper = ValidationDisplayHelper;

// 兼容性导出（如果其他地方有使用）
export default ValidationDisplayHelper;
