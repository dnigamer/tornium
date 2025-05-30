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

import typing
import uuid

from flask import render_template
from flask_login import current_user, login_required
from peewee import DoesNotExist
from tornium_commons.models import Faction, Server, ServerOCConfig, ServerOCRangeConfig


@login_required
def oc_dashboard(guild_id):
    try:
        guild: Server = (
            Server.select(
                Server.factions,
                Server.sid,
                Server.name,
                Server.admins,
            )
            .where(Server.sid == int(guild_id))
            .get()
        )
    except (ValueError, TypeError, DoesNotExist):
        return (
            render_template(
                "errors/error.html",
                title="Server Not Found",
                error="The server ID could not be located in the database.",
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

    factions: typing.List[Faction] = []

    for faction in guild.factions:
        try:
            faction: Faction = (
                Faction.select(Faction.tid, Faction.name, Faction.guild, Faction.has_migrated_oc)
                .where(Faction.tid == faction)
                .get()
            )

            if faction.guild_id != guild.sid:
                continue

            faction.aa_keys_missing = len(faction.aa_keys) == 0
            factions.append(faction)
        except DoesNotExist:
            continue

    for faction in factions:
        # TODO: Limit selections on this query
        faction.server_oc_config: typing.Optional[ServerOCConfig] = (
            ServerOCConfig.select()
            .where((ServerOCConfig.faction_id == faction.tid) & (ServerOCConfig.server_id == faction.guild_id))
            .first()
        )

        if faction.server_oc_config is None:
            # TODO: maybe use function in ServerOCConfig
            faction.server_oc_config = ServerOCConfig.create(
                guid=uuid.uuid4(),
                server_id=faction.guild_id,
                faction_id=faction.tid,
            )

        faction.server_oc_config.local_range_configs = [
            config
            for config in ServerOCRangeConfig.select(
                ServerOCRangeConfig.oc_name, ServerOCRangeConfig.minimum, ServerOCRangeConfig.maximum
            ).where(ServerOCRangeConfig.server_oc_config == faction.server_oc_config.guid)
        ]
        faction.server_oc_config.local_range_crimes = [
            config.oc_name for config in faction.server_oc_config.local_range_configs
        ]

    return render_template(
        "bot/oc.html",
        guild=guild,
        factions=factions,
        guildid=guild_id,
    )
