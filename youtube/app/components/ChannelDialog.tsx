"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Button } from "./ui/button";

const ChannelDialog = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = () => {
    console.log("Naya channel:", { name, handle, description });
    setName("");
    setHandle("");
    setDescription("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger: avatar button */}
      <DialogTrigger className="ml-2 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-purple-600 text-sm font-medium text-white">
        S
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Channel</DialogTitle>
          <DialogDescription>
            Create a new channel by providing the necessary details below.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Channel name"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="@handle"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Channel description"
            rows={3}
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-black focus:outline-none"
          />
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChannelDialog;