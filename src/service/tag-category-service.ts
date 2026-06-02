import type { Category, Tag } from '@halo-dev/api-client';
import { generateSlug } from '../content/frontmatter-parser';
import type { HaloClient } from '../halo-client';

export class TagCategoryService {
  private client: HaloClient;

  constructor(client: HaloClient) {
    this.client = client;
  }

  async getAllTags(): Promise<Tag[]> {
    const response = await this.client.coreApi.content.tag.listTag();
    return response.data.items;
  }

  async getAllCategories(): Promise<Category[]> {
    const response = await this.client.coreApi.content.category.listCategory();
    return response.data.items;
  }

  async getTagNames(displayNames: string[]): Promise<string[]> {
    const allTags = await this.getAllTags();
    const notExistDisplayNames = displayNames.filter(
      (name) => !allTags.find((item) => item.spec.displayName === name),
    );
    const newTags = await Promise.all(
      notExistDisplayNames.map((name) =>
        this.client.httpClient.post('/apis/content.halo.run/v1alpha1/tags', {
          spec: {
            displayName: name,
            slug: generateSlug(name),
            color: '#ffffff',
            cover: '',
          },
          apiVersion: 'content.halo.run/v1alpha1',
          kind: 'Tag',
          metadata: { name: '', generateName: 'tag-' },
        }),
      ),
    );
    const existNames = displayNames
      .map((name) => {
        const found = allTags.find((item) => item.spec.displayName === name);
        return found ? found.metadata.name : undefined;
      })
      .filter(Boolean) as string[];
    return [...existNames, ...newTags.map((item) => item.data.metadata.name)];
  }

  async getCategoryNames(displayNames: string[]): Promise<string[]> {
    const allCategories = await this.getAllCategories();
    const notExistDisplayNames = displayNames.filter(
      (name) => !allCategories.find((item) => item.spec.displayName === name),
    );
    const newCategories = await Promise.all(
      notExistDisplayNames.map((name) =>
        this.client.httpClient.post('/apis/content.halo.run/v1alpha1/categories', {
          spec: {
            displayName: name,
            slug: generateSlug(name),
            description: '',
            cover: '',
            template: '',
            priority: 0,
            children: [],
          },
          apiVersion: 'content.halo.run/v1alpha1',
          kind: 'Category',
          metadata: { name: '', generateName: 'category-' },
        }),
      ),
    );
    const existNames = displayNames
      .map((name) => {
        const found = allCategories.find((item) => item.spec.displayName === name);
        return found ? found.metadata.name : undefined;
      })
      .filter(Boolean) as string[];
    return [...existNames, ...newCategories.map((item) => item.data.metadata.name)];
  }

  async getTagDisplayNames(names: string[]): Promise<string[]> {
    const allTags = await this.getAllTags();
    return names
      .map((name) => {
        const found = allTags.find((item) => item.metadata.name === name);
        return found ? found.spec.displayName : undefined;
      })
      .filter(Boolean) as string[];
  }

  async getCategoryDisplayNames(names: string[]): Promise<string[]> {
    const allCategories = await this.getAllCategories();
    return names
      .map((name) => {
        const found = allCategories.find((item) => item.metadata.name === name);
        return found ? found.spec.displayName : undefined;
      })
      .filter(Boolean) as string[];
  }
}
