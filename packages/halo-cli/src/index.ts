#!/usr/bin/env node

import { Command } from 'commander';
import { config } from 'dotenv';
import { HaloClient } from '@obsidian-halo-plus/halo-sdk';

// 加载环境变量
config();

const program = new Command();

program
  .name('halo')
  .description('Halo CLI - Manage your Halo blog from command line')
  .version('0.1.0');

// 获取客户端配置
function getClient(): HaloClient {
  const baseUrl = process.env.HALO_BASE_URL;
  const token = process.env.HALO_TOKEN;

  if (!baseUrl || !token) {
    console.error('Error: HALO_BASE_URL and HALO_TOKEN must be set in environment or .env file');
    process.exit(1);
  }

  return new HaloClient({ baseUrl, token });
}

// Post 命令
const postCmd = program
  .command('post')
  .description('Manage posts');

postCmd
  .command('list')
  .description('List all posts')
  .option('-p, --page <page>', 'Page number', '1')
  .option('-s, --size <size>', 'Page size', '10')
  .action(async (options) => {
    const client = getClient();
    const posts = client.posts;
    const result = await posts.list({
      page: parseInt(options.page),
      size: parseInt(options.size),
    });

    console.log(`Posts (Page ${result.page}/${result.totalPages}, Total: ${result.total})`);
    console.log('─'.repeat(60));

    for (const post of result.items) {
      const status = post.spec.publish ? '✓ Published' : '○ Draft';
      console.log(`${post.metadata.name}  ${post.spec.title}  [${status}]`);
    }
  });

postCmd
  .command('get <name>')
  .description('Get a post by name')
  .action(async (name) => {
    const client = getClient();
    const post = await client.posts.get(name);
    console.log(JSON.stringify(post, null, 2));
  });

postCmd
  .command('create')
  .description('Create a new post')
  .requiredOption('-t, --title <title>', 'Post title')
  .option('-c, --content <content>', 'Post content (HTML)')
  .option('--publish', 'Publish immediately', false)
  .action(async (options) => {
    const client = getClient();
    const post = await client.posts.create({
      title: options.title,
      content: options.content || '',
      publish: options.publish,
    });
    console.log(`Created: ${post.metadata.name}`);
  });

postCmd
  .command('delete <name>')
  .description('Delete a post')
  .action(async (name) => {
    const client = getClient();
    await client.posts.delete(name);
    console.log(`Deleted: ${name}`);
  });

postCmd
  .command('publish <name>')
  .description('Publish a post')
  .action(async (name) => {
    const client = getClient();
    await client.posts.publish(name);
    console.log(`Published: ${name}`);
  });

// Tag 命令
const tagCmd = program
  .command('tag')
  .description('Manage tags');

tagCmd
  .command('list')
  .description('List all tags')
  .action(async () => {
    const client = getClient();
    const result = await client.tags.list();

    console.log(`Tags (Total: ${result.total})`);
    console.log('─'.repeat(40));

    for (const tag of result.items) {
      console.log(`${tag.metadata.name}  ${tag.spec.displayName}`);
    }
  });

tagCmd
  .command('create')
  .description('Create a new tag')
  .requiredOption('-n, --name <name>', 'Tag display name')
  .action(async (options) => {
    const client = getClient();
    const tag = await client.tags.create({ displayName: options.name });
    console.log(`Created: ${tag.metadata.name}`);
  });

// Category 命令
const categoryCmd = program
  .command('category')
  .description('Manage categories');

categoryCmd
  .command('list')
  .description('List all categories')
  .action(async () => {
    const client = getClient();
    const result = await client.categories.list();

    console.log(`Categories (Total: ${result.total})`);
    console.log('─'.repeat(40));

    for (const category of result.items) {
      console.log(`${category.metadata.name}  ${category.spec.displayName}`);
    }
  });

categoryCmd
  .command('create')
  .description('Create a new category')
  .requiredOption('-n, --name <name>', 'Category display name')
  .action(async (options) => {
    const client = getClient();
    const category = await client.categories.create({ displayName: options.name });
    console.log(`Created: ${category.metadata.name}`);
  });

// 连接测试命令
program
  .command('test-connection')
  .description('Test connection to Halo server')
  .action(async () => {
    const client = getClient();
    const isConnected = await client.validateConnection();
    if (isConnected) {
      console.log('✓ Connection successful');
    } else {
      console.error('✗ Connection failed');
      process.exit(1);
    }
  });

program.parse();
