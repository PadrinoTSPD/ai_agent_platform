-- 6. 智能体表
CREATE TABLE IF NOT EXISTS `agent` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '智能体ID',
  `name` VARCHAR(255) NOT NULL COMMENT '智能体名称',
  `description` TEXT COMMENT '智能体描述',
  `avatar` VARCHAR(255) DEFAULT NULL COMMENT '智能体头像URL',
  `category` VARCHAR(64) NOT NULL COMMENT '智能体分类',
  `model` VARCHAR(64) NOT NULL COMMENT '模型类型',
  `system_prompt` TEXT COMMENT '系统提示词',
  `temperature` DECIMAL(3,2) DEFAULT 0.7 COMMENT '生成文本temperature参数',
  `max_tokens` INT DEFAULT 2000 COMMENT '最大生成tokens数',
  `is_public` TINYINT(1) DEFAULT 0 COMMENT '是否公开，0=私有，1=公开',
  `creator_id` BIGINT NOT NULL COMMENT '创建者用户ID',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_category` (`category`),
  INDEX `idx_creator_id` (`creator_id`),
  INDEX `idx_name` (`name`),
  CONSTRAINT `fk_agent_creator` FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='智能体表';

-- 7. 会话表
CREATE TABLE IF NOT EXISTS `conversation` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '会话ID',
  `creator_id` BIGINT NOT NULL COMMENT '创建者用户ID',
  `agent_id` BIGINT NOT NULL COMMENT '对应的智能体id',
  `title` VARCHAR(255) DEFAULT NULL COMMENT '会话标题',
  `metadata` JSON DEFAULT NULL COMMENT '元数据',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_creator_id` (`creator_id`),
  INDEX `idx_title` (`title`),
  CONSTRAINT `fk_conversation_creator` FOREIGN KEY (`creator_id`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_conversation_agent` FOREIGN KEY (`agent_id`) REFERENCES `agent`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话表';

-- 8. 消息表
CREATE TABLE IF NOT EXISTS `message` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '消息ID',
  `conversation_id` BIGINT NOT NULL COMMENT '所属会话ID',
  `role` ENUM('user','assistant') NOT NULL COMMENT '发送者角色',
  `content` TEXT NOT NULL COMMENT '消息内容',
  `type` ENUM('text','image','file', 'video') NOT NULL DEFAULT 'text' COMMENT '消息类型',
  `metadata` JSON DEFAULT NULL COMMENT '附加信息，如附件等',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  INDEX `idx_conversation_id` (`conversation_id`),
  INDEX `idx_created_at` (`created_at`),
  CONSTRAINT `fk_message_conversation` FOREIGN KEY (`conversation_id`) REFERENCES `conversation`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息表';
