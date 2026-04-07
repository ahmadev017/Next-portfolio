import { defineField, defineType } from "sanity";

export default defineType({
  name: "chatSession",
  title: "Chat Sessions",
  type: "document",
  fields: [
    defineField({
      name: "userId",
      title: "User ID",
      type: "string",
      validation: (Rule) => Rule.required(),
      readOnly: true,
    }),
    defineField({
      name: "userName",
      title: "User Name",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "userEmail",
      title: "User Email",
      type: "string",
      readOnly: true,
    }),
    defineField({
      name: "createdAt",
      title: "Created At",
      type: "datetime",
      readOnly: true,
    }),
    defineField({
      name: "updatedAt",
      title: "Updated At",
      type: "datetime",
      readOnly: true,
    }),
    defineField({
      name: "lastMessageAt",
      title: "Last Message At",
      type: "datetime",
      readOnly: true,
    }),
    defineField({
      name: "messages",
      title: "Messages",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            { name: "role", title: "Role", type: "string" },
            { name: "content", title: "Content", type: "text" },
            { name: "createdAt", title: "Created At", type: "datetime" },
          ],
        },
      ],
    }),
  ],
  preview: {
    select: {
      title: "userName",
      subtitle: "userEmail",
      userId: "userId",
      updatedAt: "updatedAt",
    },
    prepare(selection) {
      const { title, subtitle, userId, updatedAt } = selection as {
        title?: string;
        subtitle?: string;
        userId?: string;
        updatedAt?: string;
      };
      const label = title || subtitle || userId || "Chat Session";
      const time = updatedAt
        ? new Date(updatedAt).toLocaleString()
        : "No updates yet";
      return {
        title: label,
        subtitle: `Last update: ${time}`,
      };
    },
  },
});
