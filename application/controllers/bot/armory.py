# Copyright (C) 2021-2025 tiksan
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program.  If not, see <https://www.gnu.org/licenses/>.

from flask import render_template
from flask_login import current_user, login_required
from peewee import DoesNotExist
from tornium_commons.models import Server


@login_required
def armory_dashboard(guild_id: int):
    try:
        guild: Server = Server.select(Server.admins).where(Server.sid == guild_id).get()
    except DoesNotExist:
        return (
            render_template(
                "errors/error.html",
                title="Guild Not Found",
                error="No Discord server could be located with the passed guild ID",
            ),
            400,
        )

    if current_user.tid not in guild.admins:
        return (
            render_template(
                "errors/error.html",
                title="Permission Denied",
                error="Only server admins are able to access this page, and you do not have this permission.",
            ),
            403,
        )

    return render_template("bot/armory.html", guild_id=guild_id)
